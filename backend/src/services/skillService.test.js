import SkillService from './skillService.js';

class MockStorage {
  constructor() {
    this.skills = [];
    this.skillIdCounter = 0;
  }

  createSkill(skillData) {
    const skill = { id: String(++this.skillIdCounter), ...skillData };
    this.skills.push(skill);
    return Promise.resolve(skill);
  }

  findSkillsByUserId(userId) {
    return Promise.resolve(this.skills.filter(skill => skill.userId === userId));
  }

  findSkillById(id) {
    return Promise.resolve(this.skills.find(skill => skill.id === id) || null);
  }

  markSkillAsPracticed(id) {
    const skill = this.skills.find(item => item.id === id);
    if (skill) {
      skill.lastPracticedAt = new Date().toISOString();
    }
    return Promise.resolve(skill || null);
  }

  createCalendarEvent() {
    return Promise.resolve(true);
  }

  deleteSkill(id) {
    const index = this.skills.findIndex(skill => skill.id === id);
    if (index !== -1) {
      this.skills.splice(index, 1);
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }
}

describe('SkillService', () => {
  let skillService;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    skillService = new SkillService(mockStorage);
  });

  describe('createSkill', () => {
    it('creates a new skill and calculates current strength', async () => {
      const skill = await skillService.createSkill('user1', {
        name: 'Python',
        category: 'Programming',
        initialProficiency: 75,
        halfLife: 7
      });

      expect(skill).toBeDefined();
      expect(skill.name).toBe('Python');
      expect(skill.userId).toBe('user1');
      expect(skill.currentStrength).toBeDefined();
      expect(skill.daysSinceLastPractice).toBeLessThan(0.001);
    });

    it('throws validation errors for invalid skill data', async () => {
      await expect(
        skillService.createSkill('user1', {
          name: '',
          category: 'Programming',
          initialProficiency: 120,
          halfLife: 7
        })
      ).rejects.toThrow();
    });
  });

  describe('getUserSkills', () => {
    beforeEach(async () => {
      await skillService.createSkill('user1', {
        name: 'JavaScript',
        category: 'Programming',
        initialProficiency: 80,
        halfLife: 7
      });

      await skillService.createSkill('user1', {
        name: 'CSS',
        category: 'Design',
        initialProficiency: 70,
        halfLife: 5
      });

      await skillService.createSkill('user2', {
        name: 'Java',
        category: 'Programming',
        initialProficiency: 85,
        halfLife: 7
      });
    });

    it('returns only skills for the requested user', async () => {
      const skills = await skillService.getUserSkills('user1');

      expect(skills).toHaveLength(2);
      expect(skills.every(skill => skill.userId === 'user1')).toBe(true);
      expect(skills.some(skill => skill.name === 'JavaScript')).toBe(true);
      expect(skills.some(skill => skill.name === 'Java')).toBe(false);
    });
  });

  describe('markAsPracticed', () => {
    it('updates last practiced time for the owner', async () => {
      const created = await skillService.createSkill('user1', {
        name: 'TypeScript',
        category: 'Programming',
        initialProficiency: 60,
        halfLife: 7
      });

      const updated = await skillService.markAsPracticed(created.id, 'user1');
      expect(updated).toBeDefined();
      expect(updated.userId).toBe('user1');
      expect(updated.daysSinceLastPractice).toBeLessThan(0.001);
    });

    it('rejects updates from another user', async () => {
      const created = await skillService.createSkill('user1', {
        name: 'Rust',
        category: 'Programming',
        initialProficiency: 60,
        halfLife: 7
      });

      await expect(skillService.markAsPracticed(created.id, 'user2')).rejects.toThrow(
        'Unauthorized: You can only update your own skills'
      );
    });
  });

  describe('deleteSkill', () => {
    it('deletes the user-owned skill', async () => {
      const created = await skillService.createSkill('user1', {
        name: 'Go',
        category: 'Programming',
        initialProficiency: 50,
        halfLife: 7
      });

      const result = await skillService.deleteSkill(created.id, 'user1');
      expect(result).toBe(true);
      expect(await skillService.getSkillById(created.id)).toBeNull();
    });

    it('rejects delete requests from other users', async () => {
      const created = await skillService.createSkill('user1', {
        name: 'SQL',
        category: 'Database',
        initialProficiency: 65,
        halfLife: 7
      });

      await expect(skillService.deleteSkill(created.id, 'user2')).rejects.toThrow(
        'Unauthorized: You can only delete your own skills'
      );
    });
  });
});
