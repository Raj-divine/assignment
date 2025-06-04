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

const getTokens = async () => {
    try {
        const cookies = await getCookies();
        if (!cookies) throw new Error('Failed to get cookies');
        const res = await fetch('https://challenge.sunvoy.com/settings/tokens', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        })

        const html = await res.text()

        const hiddenInputValues: { [id: string]: string } = {};

        // Regex to find all hidden input tags
        const hiddenInputRegex = /<input[^>]*type="hidden"[^>]*>/gi;
        const matches = html.match(hiddenInputRegex);

        if (matches) {
            matches.forEach(inputTag => {
                // Extract id and value from each input tag
                const idMatch = inputTag.match(/id="([^"]*)"/);
                const valueMatch = inputTag.match(/value="([^"]*)"/);

                if (idMatch && valueMatch) {
                    const id = idMatch[1];
                    const value = valueMatch[1];
                    hiddenInputValues[id] = value;
                }
            });
        }
        return hiddenInputValues;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const generateCheckCodeString = (values: { [key: string]: string }) => {
    if (!values) {
        console.error("Values are not provided");
        process.exit(1);
    }
    const timestamp = Math.floor(Date.now() / 1e3)
    const checkCodeData: { [key: string]: string } = {
        ...values,
        timestamp: timestamp.toString(),
    }

    const dataString = Object.keys(checkCodeData).sort().map(data => `${data}=${encodeURIComponent(checkCodeData[data])}`).join("&")
    const checkCode = crypto.createHmac("sha1", "mys3cr3t").update(dataString).digest('hex').toUpperCase(); //The secret is hard coded here but it should be stored in .env file in a production env.
    return `${dataString}&checkcode=${checkCode}`;
}

const getCurrentlyLoggedInUser = async () => {
    try {
        const tokens = await getTokens();
        const checkCodeString = generateCheckCodeString(tokens);
        const cookies = await getCookies();
        if (!tokens || !checkCodeString || !cookies) throw new Error('Failed to get tokens, checkCode or cookies');
        const res = await fetch('https://api.challenge.sunvoy.com/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },
            body: new URLSearchParams(checkCodeString)
        })

        const currentUser = await res.json()

        const existingUsers = JSON.parse(await fs.readFile('users.json', 'utf-8'));
        existingUsers.push(currentUser);
        await fs.writeFile('users.json', JSON.stringify(existingUsers, null, 2));

        return getCurrentlyLoggedInUser;
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const main = async () => {
    try {
        await getUsers();
        await getCurrentlyLoggedInUser()
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main()