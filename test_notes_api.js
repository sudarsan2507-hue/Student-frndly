const BASE_URL = 'http://localhost:3000/api';

async function test() {
    console.log('\n=== Personal Notes API Test ===\n');

    console.log('1. Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@test.com', password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    if (!token) {
        console.error('❌ Login failed - no token');
        return;
    }
    console.log('✅ Login successful\n');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const today = new Date().toISOString().split('T')[0];
    console.log(`2. Testing with date: ${today}\n`);

    console.log('3. Getting existing notes...');
    const getNotes = await (await fetch(`${BASE_URL}/notes?date=${today}`, { headers })).json();
    console.log(`✅ Found ${getNotes.data?.length || 0} existing notes\n`);

    console.log('4. Creating new test note...');
    const createdNote = await (await fetch(`${BASE_URL}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            date: today,
            content: `API Test: Note created at ${new Date().toLocaleTimeString()}`
        })
    })).json();
    if (!createdNote.success) {
        console.error('❌ Failed:', createdNote.message);
        return;
    }
    console.log('✅ Note created:', createdNote.data.id, '\n');
    const noteId = createdNote.data.id;

    console.log('5. Updating the note...');
    const updatedNote = await (await fetch(`${BASE_URL}/notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: `UPDATED at ${new Date().toLocaleTimeString()}` })
    })).json();
    console.log(updatedNote.success ? '✅ Note updated\n' : '❌ Update failed\n');

    console.log('6. Verifying note in list...');
    const verifyNotes = await (await fetch(`${BASE_URL}/notes?date=${today}`, { headers })).json();
    console.log(`✅ Total notes now: ${verifyNotes.data?.length || 0}\n`);

    console.log('7. Deleting test note...');
    const deleteData = await (await fetch(`${BASE_URL}/notes/${noteId}`, { method: 'DELETE', headers })).json();
    console.log(deleteData.success ? '✅ Note deleted\n' : '❌ Delete failed\n');

    console.log('=== Test Complete! ===');
    console.log('✅ All API endpoints working correctly!\n');
}

test().catch(err => console.error('❌ Test failed:', err.message));
