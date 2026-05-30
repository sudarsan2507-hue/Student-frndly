# Retention Prediction Model

## Overview
The Retention Service provides a deterministic skill retention prediction system based on the **Ebbinghaus Forgetting Curve**, an exponential decay model proven effective for learning retention estimation.

## Model Formula
```
retention = initialProficiency * 0.5^(daysSincePractice / halfLife) * adaptiveMultiplier
```

### Parameters
- **initialProficiency** (0-100): Starting skill level
- **daysSincePractice**: Days elapsed since last practice/test
- **halfLife** (default: 7 days): Time for retention to decay to 50%
- **adaptiveMultiplier** (default: 1.0): Factor to adjust decay rate per skill

### Example
- Skill with 80% proficiency, halfLife=7, practiced 7 days ago:
  - Retention = 80 * 0.5^(7/7) * 1.0 = **40%**
- Same skill, practiced 14 days ago:
  - Retention = 80 * 0.5^(14/7) * 1.0 = **20%**

## API Endpoints

### 1. Predict Retention (Single Skill)
**POST** `/api/retention/predict`
```json
{
  "skillId": "skill-uuid-here"
}
```
**Response:**
```json
{
  "retention": 45.3,
  "daysUnpracticed": 9.5,
  "halfLife": 7,
  "adaptiveMultiplier": 1.0,
  "decayFactor": 0.707,
  "explanation": "Retention = 80 * 0.5^(9.5 / 7) * 1.0 = 45"
}
```

### 2. Get User Retention Summary
**GET** `/api/retention/user/:userId`

**Response:**
```json
{
  "userId": "user-uuid",
  "totalSkills": 5,
  "averageRetention": 62.4,
  "skills": [
    {
      "skillId": "skill-1",
      "skillName": "Python Basics",
      "retention": 75.2,
      "daysUnpracticed": 3.1
    },
    ...
  ],
  "summary": "Average retention across 5 skill(s): 62.4%"
}
```

### 3. Estimate Threshold Date
**POST** `/api/retention/threshold`
```json
{
  "skillId": "skill-uuid",
  "threshold": 50
}
```
**Response:**
```json
{
  "daysUntilThreshold": 8.2,
  "estimatedDate": "2026-06-07T12:00:00.000Z",
  "willReachThreshold": true
}
```

### 4. Health Check
**GET** `/api/retention/health`
```json
{
  "status": "ok",
  "service": "retention",
  "timestamp": "2026-05-30T10:00:00.000Z"
}
```

## Use Cases

1. **Dashboard Alerts**: Show students when skills are decaying below thresholds
2. **Practice Recommendations**: Suggest practicing skills with low retention scores
3. **Learning Analytics**: Track retention trends across skills over time
4. **Study Planning**: Estimate optimal review intervals per skill

## Future Enhancements

- Machine learning model trained on historical test accuracy data
- Personalized decay rates per student (adaptive halfLife)
- Integration with spaced repetition algorithms (SM-2, Leitner)
- Batch threshold estimation for multiple skills
