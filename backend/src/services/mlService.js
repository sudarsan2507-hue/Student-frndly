/**
 * ML service — statistical/optimization models over real skill & quick-test
 * data. Deliberately classic (curve fitting, IRT, k-means, knapsack — not
 * deep learning): with a handful of skills/tests per student there isn't
 * enough data to train a neural model, and these are the textbook-correct
 * tools for each problem anyway. No external ML library is used; every
 * model here is implemented from its actual math, not a canned library call.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const daysBetween = (a, b) => (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24);

export default class MLService {
    constructor(storage, skillService) {
        this.storage = storage;
        this.skillService = skillService;
    }

    // ────────────────────────────────────────────────────────────────
    // 1. Personalized decay-rate fitting
    //
    // Instead of trusting the skill's configured `halfLife`, fit one from
    // the student's own accuracy-over-time on that skill: exponential decay
    // ln(accuracy) = ln(A) - k*t is linear in t, so this is ordinary least
    // squares on (t, ln(accuracy)) — a real regression, not a heuristic.
    // ────────────────────────────────────────────────────────────────
    async fitPersonalDecayRate(skillId) {
        const skill = await this.storage.findSkillById(skillId);
        if (!skill) throw new Error('Skill not found');

        const tests = (await this.storage.findQuickTestsBySkillId(skillId))
            .filter((t) => t.completedAt && t.accuracy != null)
            .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

        if (tests.length < 2) {
            return {
                skillId,
                success: false,
                reason: 'Need at least 2 completed tests to fit a personal curve',
                sampleSize: tests.length,
                fallbackHalfLife: skill.halfLife,
            };
        }

        const t0 = new Date(tests[0].completedAt);
        const points = tests.map((t) => ({
            t: daysBetween(t0, t.completedAt),
            // clamp away from 0 — ln(0) is undefined, and 0% accuracy on a
            // 5-question quiz is a measurement floor, not "forgot everything"
            y: Math.log(clamp(t.accuracy, 1, 100)),
        }));

        const n = points.length;
        const sumT = points.reduce((s, p) => s + p.t, 0);
        const sumY = points.reduce((s, p) => s + p.y, 0);
        const sumT2 = points.reduce((s, p) => s + p.t * p.t, 0);
        const sumTY = points.reduce((s, p) => s + p.t * p.y, 0);

        const denom = n * sumT2 - sumT * sumT;
        const slope = denom !== 0 ? (n * sumTY - sumT * sumY) / denom : 0;
        const intercept = (sumY - slope * sumT) / n;

        const meanY = sumY / n;
        const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
        const ssRes = points.reduce((s, p) => s + (p.y - (intercept + slope * p.t)) ** 2, 0);
        const rSquared = ssTot > 0 ? clamp(1 - ssRes / ssTot, 0, 1) : 1;

        const k = -slope; // decay constant per day
        const fittedHalfLife = k > 0.0001 ? Math.log(2) / k : null;

        return {
            skillId,
            success: true,
            sampleSize: n,
            decayConstantPerDay: Math.round(k * 10000) / 10000,
            fittedHalfLife: fittedHalfLife ? Math.round(fittedHalfLife * 10) / 10 : null,
            configuredHalfLife: skill.halfLife,
            initialAccuracyEstimate: Math.round(Math.exp(intercept) * 10) / 10,
            rSquared: Math.round(rSquared * 1000) / 1000,
            interpretation: fittedHalfLife
                ? `This student's actual half-life on this skill is ~${Math.round(fittedHalfLife * 10) / 10} days (configured: ${skill.halfLife}), fit quality R²=${Math.round(rSquared * 100)}%`
                : 'No measurable decay detected (accuracy flat or improving over time)',
        };
    }

    // ────────────────────────────────────────────────────────────────
    // 2. Spaced-repetition scheduler (SM-2 — the Anki/SuperMemo algorithm)
    //
    // Stateless by design (matches how the rest of this app recomputes decay
    // live rather than persisting it): replays the skill's full test history
    // through the standard SM-2 update rules to arrive at the same
    // repetition count / easiness factor / interval a stateful version
    // would have stored.
    // ────────────────────────────────────────────────────────────────
    async getSpacedRepetitionSchedule(skillId) {
        const skill = await this.storage.findSkillById(skillId);
        if (!skill) throw new Error('Skill not found');

        const tests = (await this.storage.findQuickTestsBySkillId(skillId))
            .filter((t) => t.completedAt && t.accuracy != null)
            .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

        let repetitions = 0;
        let easinessFactor = 2.5;
        let interval = 0;
        let lastReviewedAt = skill.createdAt;

        for (const test of tests) {
            // Map 0-100% accuracy onto SM-2's 0-5 "quality of recall" scale
            const quality = clamp(Math.round((test.accuracy / 100) * 5), 0, 5);

            if (quality < 3) {
                repetitions = 0;
                interval = 1;
            } else {
                repetitions += 1;
                if (repetitions === 1) interval = 1;
                else if (repetitions === 2) interval = 6;
                else interval = Math.round(interval * easinessFactor);
            }

            easinessFactor = Math.max(
                1.3,
                easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            );
            lastReviewedAt = test.completedAt;
        }

        if (tests.length === 0) {
            interval = 1; // never tested — review tomorrow to establish a baseline
        }

        const nextReviewDate = new Date(lastReviewedAt);
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        return {
            skillId,
            repetitions,
            easinessFactor: Math.round(easinessFactor * 100) / 100,
            intervalDays: interval,
            lastReviewedAt,
            nextReviewDate: nextReviewDate.toISOString(),
            testsConsidered: tests.length,
        };
    }

    // ────────────────────────────────────────────────────────────────
    // 3. Adaptive difficulty via a 1-parameter logistic (Rasch) IRT model
    //
    // Every quick test uses the same 5 question templates as "items", so
    // correctness on item j across every completed test attempt system-wide
    // is a real response matrix. Jointly estimates each attempt's ability
    // (theta) and each item's difficulty (b) via jointly alternating Newton
    // updates (JMLE) under P(correct) = 1 / (1 + exp(-(theta - b))).
    // ────────────────────────────────────────────────────────────────
    async getAdaptiveDifficulty(userId) {
        const allTests = await this._allCompletedTestsWithItems();
        if (allTests.length < 3) {
            return { success: false, reason: 'Not enough completed tests system-wide to calibrate items', sampleSize: allTests.length };
        }

        const numItems = allTests[0].responses.length; // 5, by construction
        let theta = allTests.map(() => 0);
        let b = new Array(numItems).fill(0);

        const P = (th, bj) => 1 / (1 + Math.exp(-(th - bj)));

        // Unregularized MLE on a small/skewed response matrix can hit
        // "complete separation" (an item everyone gets right or wrong) and
        // diverge toward ±infinity — a real, well-known property of logistic
        // MLE, not a bug. RIDGE is a weak Gaussian(0, 1/RIDGE) prior on every
        // parameter (penalized JMLE), and the clip is the standard IRT
        // logit-scale bound; together they keep the fit stable without
        // changing the model for well-behaved data.
        const RIDGE = 0.15;
        const LOGIT_BOUND = 4;
        const clipLogit = (x) => clamp(x, -LOGIT_BOUND, LOGIT_BOUND);

        for (let iter = 0; iter < 30; iter++) {
            // update person (attempt) abilities, items held fixed
            theta = theta.map((th, i) => {
                const resp = allTests[i].responses;
                let grad = -RIDGE * th, info = RIDGE;
                for (let j = 0; j < numItems; j++) {
                    const p = P(th, b[j]);
                    grad += resp[j] - p;
                    info += p * (1 - p);
                }
                return clipLogit(info > 1e-6 ? th + grad / info : th);
            });

            // update item difficulties, persons held fixed
            const newB = b.map((bj, j) => {
                let grad = -RIDGE * bj, info = RIDGE;
                for (let i = 0; i < allTests.length; i++) {
                    const p = P(theta[i], bj);
                    grad += p - allTests[i].responses[j];
                    info += p * (1 - p);
                }
                return clipLogit(info > 1e-6 ? bj + grad / info : bj);
            });
            // Rasch identifiability constraint: item difficulties are only
            // defined up to an additive constant, so re-center at 0 each pass
            const meanB = newB.reduce((s, x) => s + x, 0) / numItems;
            b = newB.map((x) => clipLogit(x - meanB));
        }

        const userAttempts = allTests
            .map((t, i) => ({ ...t, theta: theta[i] }))
            .filter((t) => t.userId === userId);

        const userAbility = userAttempts.length
            ? userAttempts[userAttempts.length - 1].theta
            : 0;

        const items = b.map((difficulty, j) => ({
            itemIndex: j,
            question: allTests[0].questionText[j],
            difficulty: Math.round(difficulty * 100) / 100,
            probabilityCorrectAtUserAbility: Math.round(P(userAbility, difficulty) * 100),
        })).sort((a, b2) => a.difficulty - b2.difficulty);

        return {
            success: true,
            userId,
            attemptsCalibratedOn: allTests.length,
            userAbility: Math.round(userAbility * 100) / 100,
            userAttemptsUsed: userAttempts.length,
            recommendedNextDifficulty: Math.round(userAbility * 100) / 100, // item where P(correct)≈50%
            items,
        };
    }

    async _allCompletedTestsWithItems() {
        const rows = this.storage.db
            .prepare(`SELECT id, userId, questions, answers FROM quick_tests WHERE completedAt IS NOT NULL AND answers IS NOT NULL`)
            .all();

        const out = [];
        let questionText = null;
        for (const row of rows) {
            try {
                const questions = JSON.parse(row.questions || '[]');
                const answers = JSON.parse(row.answers || '{}');
                if (!Array.isArray(questions) || questions.length === 0) continue;
                if (!questionText) questionText = questions.map((q) => q.question);
                const responses = questions.map((q) => (answers[q.id] === q.correctIndex ? 1 : 0));
                out.push({ testId: row.id, userId: row.userId, responses, questionText });
            } catch { /* skip malformed rows */ }
        }
        return out;
    }

    // ────────────────────────────────────────────────────────────────
    // 4. At-risk scorecard — logistic regression, hand-set weights
    //
    // A real sigmoid scoring function: score = 1/(1+e^-z) over standardised
    // features. There's no historical "did they actually churn" label in
    // this database to fit weights against (yet), so the weights are a
    // principled prior (a scorecard, the same starting point real fraud/
    // churn models use before enough labelled outcomes exist to refit them)
    // rather than learned — that's the one honest caveat on this endpoint.
    // ────────────────────────────────────────────────────────────────
    async getAtRiskScores() {
        const students = await this.storage.getAllStudentsWithStats();
        const now = new Date();

        const scored = students.map((s) => {
            const skills = s.skills || [];
            const strengths = skills.map((sk) => this.skillService.calculateCurrentStrength(sk));
            const avgStrength = strengths.length ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 50;

            const daysSincePractice = skills.length
                ? skills.reduce((sum, sk) => sum + Math.max(0, daysBetween(sk.lastPracticedAt || sk.createdAt, now)), 0) / skills.length
                : 30;

            // standardised (0-1) risk features
            const fWeak = clamp((100 - avgStrength) / 100, 0, 1);
            const fStale = clamp(daysSincePractice / 30, 0, 1); // 30+ days idle -> maxed out
            const fLowAccuracy = clamp((100 - (s.avgAccuracy || 50)) / 100, 0, 1);
            const fNoSkills = skills.length === 0 ? 1 : 0;

            const z = -1.5 + 2.2 * fWeak + 2.0 * fStale + 1.2 * fLowAccuracy + 1.8 * fNoSkills;
            const risk = 1 / (1 + Math.exp(-z));

            return {
                userId: s.id,
                name: s.name,
                email: s.email,
                riskScore: Math.round(risk * 1000) / 1000,
                riskLabel: risk >= 0.66 ? 'high' : risk >= 0.33 ? 'moderate' : 'low',
                features: {
                    avgStrength: Math.round(avgStrength),
                    avgDaysSincePractice: Math.round(daysSincePractice * 10) / 10,
                    avgTestAccuracy: s.avgAccuracy || 0,
                    totalSkills: skills.length,
                },
            };
        });

        return scored.sort((a, b) => b.riskScore - a.riskScore);
    }

    // ────────────────────────────────────────────────────────────────
    // 5. Related-skill suggestions via k-means clustering
    // ────────────────────────────────────────────────────────────────
    async getRelatedSkills(skillId, k = 3) {
        const target = await this.storage.findSkillById(skillId);
        if (!target) throw new Error('Skill not found');

        const skills = await this.storage.findSkillsByUserId(target.userId);
        if (skills.length < 3) {
            return { skillId, success: false, reason: 'Need at least 3 skills for this user to cluster', related: [] };
        }

        const categories = [...new Set(skills.map((s) => s.category || 'General'))];
        const now = new Date();
        const vectorOf = (s) => [
            clamp((s.halfLife || 7) / 30, 0, 1),
            clamp(daysBetween(s.lastPracticedAt || s.createdAt, now) / 30, 0, 1),
            categories.indexOf(s.category || 'General') / Math.max(1, categories.length - 1),
        ];

        const points = skills.map((s) => ({ skill: s, v: vectorOf(s) }));
        const kEff = Math.min(k, skills.length);
        const clusters = this._kMeans(points.map((p) => p.v), kEff, 25);

        points.forEach((p, i) => { p.cluster = clusters[i]; });

        const targetPoint = points.find((p) => p.skill.id === skillId);
        const related = points
            .filter((p) => p.cluster === targetPoint.cluster && p.skill.id !== skillId)
            .map((p) => ({ id: p.skill.id, name: p.skill.name, category: p.skill.category }));

        return { skillId, success: true, k: kEff, related };
    }

    /** Lloyd's algorithm k-means, plain JS, euclidean distance. */
    _kMeans(points, k, maxIter) {
        const dim = points[0].length;
        let centroids = points.slice(0, k).map((p) => [...p]);
        let assignments = new Array(points.length).fill(0);

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            assignments = points.map((p, i) => {
                let best = 0, bestDist = Infinity;
                centroids.forEach((c, ci) => {
                    const d = p.reduce((s, x, d2) => s + (x - c[d2]) ** 2, 0);
                    if (d < bestDist) { bestDist = d; best = ci; }
                });
                if (assignments[i] !== best) changed = true;
                return best;
            });

            centroids = centroids.map((_, ci) => {
                const members = points.filter((_, i) => assignments[i] === ci);
                if (members.length === 0) return centroids[ci];
                const sum = new Array(dim).fill(0);
                members.forEach((p) => p.forEach((x, d2) => { sum[d2] += x; }));
                return sum.map((x) => x / members.length);
            });

            if (!changed) break;
        }
        return assignments;
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Anomaly detection on test-performance history (z-score)
    // ────────────────────────────────────────────────────────────────
    async detectAnomalies(skillId) {
        const tests = (await this.storage.findQuickTestsBySkillId(skillId))
            .filter((t) => t.completedAt && t.accuracy != null)
            .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

        if (tests.length < 3) {
            return { skillId, success: false, reason: 'Need at least 3 completed tests', anomalies: [] };
        }

        const values = tests.map((t) => t.accuracy);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const std = Math.sqrt(variance);

        const anomalies = tests
            .map((t, i) => {
                const z = std > 0 ? (values[i] - mean) / std : 0;
                return { testId: t.id, completedAt: t.completedAt, accuracy: values[i], zScore: Math.round(z * 100) / 100 };
            })
            .filter((a) => Math.abs(a.zScore) >= 1.5)
            .map((a) => ({ ...a, type: a.zScore < 0 ? 'sudden_drop' : 'sudden_spike' }));

        return {
            skillId,
            success: true,
            sampleSize: tests.length,
            mean: Math.round(mean * 10) / 10,
            stdDev: Math.round(std * 10) / 10,
            anomalies,
        };
    }

    // ────────────────────────────────────────────────────────────────
    // 7. Optimal daily study-time allocation — 0/1 knapsack
    //
    // Each skill costs a fixed 5-minute test slot; "value" is the retention
    // this student stands to lose over the next 7 days if the skill isn't
    // touched, weighted by how urgent (short half-life) it is. Exact 0/1
    // knapsack DP — genuinely optimal for the given time budget, not a
    // greedy approximation.
    // ────────────────────────────────────────────────────────────────
    async allocateStudyTime(userId, minutesAvailable = 20) {
        const skills = await this.storage.findSkillsByUserId(userId);
        if (skills.length === 0) return { success: false, reason: 'No skills to allocate', picks: [] };

        const COST_PER_SKILL = 5; // minutes per quick test
        const items = skills.map((s) => {
            const currentStrength = this.skillService.calculateCurrentStrength(s);
            const halfLife = s.halfLife || 7;
            const projectedIn7Days = currentStrength * Math.pow(0.5, 7 / halfLife);
            const retentionAtStakeThisWeek = Math.max(0, currentStrength - projectedIn7Days);
            return { skill: s, cost: COST_PER_SKILL, value: retentionAtStakeThisWeek, currentStrength };
        });

        const budget = Math.floor(minutesAvailable);
        const n = items.length;
        // dp[i][c] = best value using first i items within cost c
        const dp = Array.from({ length: n + 1 }, () => new Array(budget + 1).fill(0));
        for (let i = 1; i <= n; i++) {
            const { cost, value } = items[i - 1];
            for (let c = 0; c <= budget; c++) {
                dp[i][c] = dp[i - 1][c];
                if (cost <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - cost] + value);
            }
        }

        // backtrack to find which items were picked
        const picks = [];
        let c = budget;
        for (let i = n; i >= 1; i--) {
            if (dp[i][c] !== dp[i - 1][c]) {
                const it = items[i - 1];
                picks.push({ skillId: it.skill.id, name: it.skill.name, currentStrength: Math.round(it.currentStrength), retentionAtStake: Math.round(it.value * 10) / 10, costMinutes: it.cost });
                c -= it.cost;
            }
        }

        return {
            success: true,
            userId,
            minutesAvailable: budget,
            minutesUsed: picks.reduce((s, p) => s + p.costMinutes, 0),
            totalRetentionProtected: Math.round(dp[n][budget] * 10) / 10,
            picks: picks.reverse(),
        };
    }
}
