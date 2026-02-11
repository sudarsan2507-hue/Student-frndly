import DataAccess from './dataAccess.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * In-memory storage implementation
 * Stores data in memory for fast access, loads initial data from JSON files
 */
class InMemoryStorage extends DataAccess {
    constructor() {
        super();
        this.users = [];
        this.skills = [];
        this.quickTests = [];
        this.calendarEvents = [];
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Load mock users from JSON file
            const usersPath = path.join(__dirname, '../../data/users.json');
            const usersData = await fs.readFile(usersPath, 'utf-8');
            this.users = JSON.parse(usersData);

            // Load skills from JSON file (if exists)
            const skillsPath = path.join(__dirname, '../../data/skills.json');
            try {
                const skillsData = await fs.readFile(skillsPath, 'utf-8');
                this.skills = JSON.parse(skillsData);
                console.log(`✓ Loaded ${this.skills.length} skills from storage`);
            } catch (err) {
                this.skills = [];
                console.log('✓ No existing skills found - starting fresh');
            }

            // Load quick tests from JSON file (if exists)
            const testsPath = path.join(__dirname, '../../data/quickTests.json');
            try {
                const testsData = await fs.readFile(testsPath, 'utf-8');
                this.quickTests = JSON.parse(testsData);
                console.log(`✓ Loaded ${this.quickTests.length} tests from storage`);
            } catch (err) {
                this.quickTests = [];
            }

            // Load calendar events from JSON file (if exists)
            const eventsPath = path.join(__dirname, '../../data/calendarEvents.json');
            try {
                const eventsData = await fs.readFile(eventsPath, 'utf-8');
                this.calendarEvents = JSON.parse(eventsData);
                console.log(`✓ Loaded ${this.calendarEvents.length} calendar events from storage`);
            } catch (err) {
                this.calendarEvents = [];
            }

            this.initialized = true;
            console.log(`✓ In-memory storage initialized with ${this.users.length} users`);
        } catch (error) {
            console.error('Error initializing in-memory storage:', error.message);
            this.users = [];
            this.skills = [];
            this.quickTests = [];
            this.initialized = true;
        }
    }

    async findUserByEmail(email) {
        if (!this.initialized) await this.initialize();
        return this.users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
    }

    async findUserById(id) {
        if (!this.initialized) await this.initialize();
        return this.users.find(user => user.id === id) || null;
    }

    async getAllUsers() {
        if (!this.initialized) await this.initialize();
        return [...this.users];
    }

    async createUser(userData) {
        if (!this.initialized) await this.initialize();
        const newUser = {
            id: String(this.users.length + 1),
            ...userData,
            createdAt: new Date().toISOString()
        };
        this.users.push(newUser);
        return newUser;
    }

    async updateUser(id, userData) {
        if (!this.initialized) await this.initialize();
        const index = this.users.findIndex(user => user.id === id);
        if (index === -1) return null;

        this.users[index] = {
            ...this.users[index],
            ...userData,
            id: this.users[index].id, // Preserve ID
            updatedAt: new Date().toISOString()
        };
        return this.users[index];
    }

    async deleteUser(id) {
        if (!this.initialized) await this.initialize();
        const index = this.users.findIndex(user => user.id === id);
        if (index === -1) return false;

        this.users.splice(index, 1);
        return true;
    }

    // Skill operations
    async createSkill(skillData) {
        if (!this.initialized) await this.initialize();
        const newSkill = {
            id: String(Date.now()),
            ...skillData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.skills.push(newSkill);
        await this.saveSkills(); // Persist to file
        return newSkill;
    }

    async findSkillById(id) {
        if (!this.initialized) await this.initialize();
        return this.skills.find(skill => skill.id === id) || null;
    }

    async findSkillsByUserId(userId) {
        if (!this.initialized) await this.initialize();
        return this.skills.filter(skill => skill.userId === userId);
    }

    async updateSkill(id, skillData) {
        if (!this.initialized) await this.initialize();
        const index = this.skills.findIndex(skill => skill.id === id);
        if (index === -1) return null;

        this.skills[index] = {
            ...this.skills[index],
            ...skillData,
            id: this.skills[index].id,
            updatedAt: new Date().toISOString()
        };
        await this.saveSkills(); // Persist to file
        return this.skills[index];
    }

    async deleteSkill(id) {
        if (!this.initialized) await this.initialize();
        const index = this.skills.findIndex(skill => skill.id === id);
        if (index === -1) return false;

        this.skills.splice(index, 1);
        await this.saveSkills(); // Persist to file
        return true;
    }

    async markSkillAsPracticed(id) {
        if (!this.initialized) await this.initialize();
        return this.updateSkill(id, {
            lastPracticedAt: new Date().toISOString()
        });
    }

    // Quick Test operations
    async createQuickTest(testData) {
        if (!this.initialized) await this.initialize();
        const newTest = {
            id: String(Date.now() + Math.random()),
            ...testData,
            createdAt: new Date().toISOString()
        };
        this.quickTests.push(newTest);
        await this.saveTests(); // Persist to file
        return newTest;
    }

    async findQuickTestById(id) {
        if (!this.initialized) await this.initialize();
        return this.quickTests.find(test => test.id === id) || null;
    }

    async findQuickTestsBySkillId(skillId) {
        if (!this.initialized) await this.initialize();
        return this.quickTests.filter(test => test.skillId === skillId);
    }

    async findQuickTestsByUserId(userId) {
        if (!this.initialized) await this.initialize();
        return this.quickTests.filter(test => test.userId === userId);
    }

    async updateQuickTest(id, testData) {
        if (!this.initialized) await this.initialize();
        const index = this.quickTests.findIndex(test => test.id === id);
        if (index === -1) return null;

        this.quickTests[index] = {
            ...this.quickTests[index],
            ...testData,
            id: this.quickTests[index].id
        };
        await this.saveTests(); // Persist to file
        return this.quickTests[index];
    }

    async deleteQuickTest(id) {
        if (!this.initialized) await this.initialize();
        const index = this.quickTests.findIndex(test => test.id === id);
        if (index === -1) return false;

        this.quickTests.splice(index, 1);
        await this.saveTests(); // Persist to file
        return true;
    }

    // Persistence methods
    async saveSkills() {
        try {
            const skillsPath = path.join(__dirname, '../../data/skills.json');
            await fs.writeFile(skillsPath, JSON.stringify(this.skills, null, 2));
        } catch (error) {
            console.error('Error saving skills:', error.message);
        }
    }

    async saveTests() {
        try {
            const testsPath = path.join(__dirname, '../../data/quickTests.json');
            await fs.writeFile(testsPath, JSON.stringify(this.quickTests, null, 2));
        } catch (error) {
            console.error('Error saving tests:', error.message);
        }
    }

    // Calendar Event operations
    async createCalendarEvent(eventData) {
        if (!this.initialized) await this.initialize();
        const newEvent = {
            id: crypto.randomUUID(),
            ...eventData,
            createdAt: new Date().toISOString()
        };
        this.calendarEvents.push(newEvent);
        await this.saveCalendarEvents();
        return newEvent;
    }

    async findCalendarEventsByUserId(userId) {
        if (!this.initialized) await this.initialize();
        return this.calendarEvents.filter(event => event.userId === userId);
    }

    async deleteCalendarEvent(id) {
        if (!this.initialized) await this.initialize();
        const index = this.calendarEvents.findIndex(event => event.id === id);
        if (index === -1) return false;

        this.calendarEvents.splice(index, 1);
        await this.saveCalendarEvents();
        return true;
    }

    async saveCalendarEvents() {
        try {
            const eventsPath = path.join(__dirname, '../../data/calendarEvents.json');
            await fs.writeFile(eventsPath, JSON.stringify(this.calendarEvents, null, 2));
        } catch (error) {
            console.error('Error saving calendar events:', error.message);
        }
    }
}

export default InMemoryStorage;
