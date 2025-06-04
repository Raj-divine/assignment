import crypto from 'crypto';
import fs from 'fs/promises'
const credentials = {
    username: "demo@example.org",
    password: "test"
} //! Credentials are hardcoded here so that the script can be run without any user interaction, in a real production env I'd store these credentials in the .env file.


const getNonce = async () => {
    try {
        const res = await fetch('https://challenge.sunvoy.com/login')
        if (!res.ok) throw new Error('Failed to fetch nonce');
        const html = await res.text()
        //regex to find the nonce value
        const nonceMatch = html.match(/name="nonce"\s+value="([^"]+)"/);
        const nonce = nonceMatch ? nonceMatch[1] : null;
        return nonce;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const getCookies = async () => {
    try {
        const nonce = await getNonce();
        if (!nonce) throw new Error('Failed to get nonce');
        const body = new URLSearchParams({
            nonce,
            username: credentials.username,
            password: credentials.password
        })
        const res = await fetch('https://challenge.sunvoy.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
            redirect: 'manual' //we are setting redirect to manual so that we can get the cookies from the response
        });
        const cookies = res.headers.get('set-cookie');
        return cookies;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const getUsers = async () => {
    try {
        const cookies = await getCookies();
        if (!cookies) throw new Error('Failed to get cookies');
        const res = await fetch('https://challenge.sunvoy.com/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        })
        const users = await res.json()
        await fs.writeFile('users.json', JSON.stringify(users, null, 2))
        return users;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getUsers()