import bcrypt from 'bcryptjs';

// Generate hashes for the test passwords
const password1 = 'password123';
const password2 = 'admin123';

const hash1 = bcrypt.hashSync(password1, 10);
const hash2 = bcrypt.hashSync(password2, 10);

console.log('Password hashes for users.json:');
console.log('');
console.log('student@test.com (password123):');
console.log(hash1);
console.log('');
console.log('admin@test.com (admin123):');
console.log(hash2);
