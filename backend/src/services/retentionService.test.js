import RetentionService from './retentionService.js';
import { jest } from '@jest/globals';

class MockDataAccess {
  constructor() {
    this.skillsById = new Map();
    this.skillsByUserId = new Map();
  }

  setSkill(skill) {
    this.skillsById.set(skill.id, skill);
    if (!this.skillsByUserId.has(skill.userId)) {
      this.skillsByUserId.set(skill.userId, []);
    }

    const current = this.skillsByUserId.get(skill.userId);
    this.skillsByUserId.set(skill.userId, [...current.filter(item => item.id !== skill.id), skill]);
  }

  findSkillById(id) {
    return Promise.resolve(this.skillsById.get(id) || null);
  }

  findSkillsByUserId(userId) {
    return Promise.resolve(this.skillsByUserId.get(userId) || []);
  }
}

describe('RetentionService', () => {
  let dataAccess;
  let retentionService;
  let fixedNow;

  beforeEach(() => {
    dataAccess = new MockDataAccess();
    retentionService = new RetentionService(dataAccess);
    fixedNow = new Date('2026-06-02T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('predictRetention', () => {
    it('returns an error payload when skill is missing', () => {
      const result = retentionService.predictRetention(null);

      expect(result.error).toBe(true);
      expect(result.retention).toBe(0);
      expect(result.daysUnpracticed).toBeNull();
    });

    it('calculates half retention after one half-life', () => {
      const skill = {
        id: 's1',
        userId: 'u1',
        name: 'React',
        initialProficiency: 80,
        lastPracticedAt: '2026-05-26T00:00:00.000Z',
        halfLife: 7,
        adaptiveDecayMultiplier: 1.0
      };

      const result = retentionService.predictRetention(skill);

      expect(result.retention).toBeCloseTo(40, 1);
      expect(result.daysUnpracticed).toBeCloseTo(7, 1);
      expect(result.decayFactor).toBeCloseTo(0.5, 2);
    });

    it('clamps retention to 100 when multiplier would exceed it', () => {
      const skill = {
        id: 's2',
        userId: 'u1',
        name: 'Node.js',
        initialProficiency: 95,
        lastPracticedAt: '2026-06-02T00:00:00.000Z',
        halfLife: 7,
        adaptiveDecayMultiplier: 1.2
      };

      const result = retentionService.predictRetention(skill);

      expect(result.retention).toBe(100);
    });
  });

  describe('getRetentionForSkill', () => {
    it('returns not found payload for missing skill', async () => {
      const result = await retentionService.getRetentionForSkill('missing');

      expect(result).toEqual({ error: 'Skill not found', skillId: 'missing' });
    });

    it('returns retention for an existing skill', async () => {
      dataAccess.setSkill({
        id: 's3',
        userId: 'u1',
        name: 'SQL',
        initialProficiency: 60,
        lastPracticedAt: '2026-06-02T00:00:00.000Z',
        halfLife: 7,
        adaptiveDecayMultiplier: 1
      });

      const result = await retentionService.getRetentionForSkill('s3');

      expect(result.retention).toBe(60);
      expect(result.daysUnpracticed).toBe(0);
    });
  });

  describe('getUserRetention', () => {
    it('returns an empty summary for user with no skills', async () => {
      const result = await retentionService.getUserRetention('u-empty');

      expect(result.totalSkills).toBe(0);
      expect(result.averageRetention).toBe(0);
      expect(result.skills).toEqual([]);
    });

    it('returns batch retention and average for user skills', async () => {
      dataAccess.setSkill({
        id: 's4',
        userId: 'u2',
        name: 'Python',
        initialProficiency: 100,
        lastPracticedAt: '2026-06-02T00:00:00.000Z',
        halfLife: 7,
        adaptiveDecayMultiplier: 1
      });

      dataAccess.setSkill({
        id: 's5',
        userId: 'u2',
        name: 'TypeScript',
        initialProficiency: 80,
        lastPracticedAt: '2026-05-26T00:00:00.000Z',
        halfLife: 7,
        adaptiveDecayMultiplier: 1
      });

      const result = await retentionService.getUserRetention('u2');

      expect(result.totalSkills).toBe(2);
      expect(result.skills).toHaveLength(2);
      expect(result.averageRetention).toBeCloseTo(70, 1);
    });
  });

  describe('estimateThresholdDate', () => {
    it('returns error for invalid input', () => {
      const result = retentionService.estimateThresholdDate(null, 50);
      expect(result).toEqual({ error: 'Invalid input' });
    });

    it('returns immediate threshold if already below threshold', () => {
      const skill = {
        initialProficiency: 40,
        halfLife: 7,
        adaptiveDecayMultiplier: 1
      };

      const result = retentionService.estimateThresholdDate(skill, 50);

      expect(result.daysUntilThreshold).toBe(0);
      expect(result.willReachThreshold).toBe(true);
      expect(result.message).toBe('Skill is already at or below threshold.');
    });

    it('estimates future threshold date for valid input', () => {
      const skill = {
        initialProficiency: 80,
        halfLife: 7,
        adaptiveDecayMultiplier: 1
      };

      const result = retentionService.estimateThresholdDate(skill, 50);

      expect(result.willReachThreshold).toBe(true);
      expect(result.daysUntilThreshold).toBeCloseTo(4.7, 1);
      expect(new Date(result.estimatedDate).getTime()).toBeGreaterThan(fixedNow.getTime());
    });
  });
});
