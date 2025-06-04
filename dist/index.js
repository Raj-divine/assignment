"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const credentials = {
    username: "demo@example.org",
    password: "test"
}; //! Credentials are hardcoded here so that the script can be run without any user interaction, in a real production env I'd store these credentials in the .env file.
const getNonce = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield fetch('https://challenge.sunvoy.com/login');
        if (!res.ok)
            throw new Error('Failed to fetch nonce');
        const html = yield res.text();
        //regex to find the nonce value
        const nonceMatch = html.match(/name="nonce"\s+value="([^"]+)"/);
        const nonce = nonceMatch ? nonceMatch[1] : null;
        return nonce;
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});
const getCookies = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nonce = yield getNonce();
        if (!nonce)
            throw new Error('Failed to get nonce');
        const body = new URLSearchParams({
            nonce,
            username: credentials.username,
            password: credentials.password
        });
        const res = yield fetch('https://challenge.sunvoy.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
            redirect: 'manual' //we are setting redirect to manual so that we can get the cookies from the response
        });
        const cookies = res.headers.get('set-cookie');
        return cookies;
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});
const getUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cookies = yield getCookies();
        if (!cookies)
            throw new Error('Failed to get cookies');
        const res = yield fetch('https://challenge.sunvoy.com/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        });
        const users = yield res.json();
        yield promises_1.default.writeFile('users.json', JSON.stringify(users, null, 2));
        return users;
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});
const getTokens = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cookies = yield getCookies();
        if (!cookies)
            throw new Error('Failed to get cookies');
        const res = yield fetch('https://challenge.sunvoy.com/settings/tokens', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        });
        const html = yield res.text();
        const hiddenInputValues = {};
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
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});
const generateCheckCodeString = (values) => {
    if (!values) {
        console.error("Values are not provided");
        process.exit(1);
    }
    const timestamp = Math.floor(Date.now() / 1e3);
    const checkCodeData = Object.assign(Object.assign({}, values), { timestamp: timestamp.toString() });
    const dataString = Object.keys(checkCodeData).sort().map(data => `${data}=${encodeURIComponent(checkCodeData[data])}`).join("&");
    const checkCode = crypto_1.default.createHmac("sha1", "mys3cr3t").update(dataString).digest('hex').toUpperCase(); //The secret is hard coded here but it should be stored in .env file in a production env.
    return `${dataString}&checkcode=${checkCode}`;
};
const getCurrentlyLoggedInUser = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokens = yield getTokens();
        const checkCodeString = generateCheckCodeString(tokens);
        const cookies = yield getCookies();
        if (!tokens || !checkCodeString || !cookies)
            throw new Error('Failed to get tokens, checkCode or cookies');
        const res = yield fetch('https://api.challenge.sunvoy.com/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },
            body: new URLSearchParams(checkCodeString)
        });
        const currentUser = yield res.json();
        const existingUsers = JSON.parse(yield promises_1.default.readFile('users.json', 'utf-8'));
        existingUsers.push(currentUser);
        yield promises_1.default.writeFile('users.json', JSON.stringify(existingUsers, null, 2));
        return getCurrentlyLoggedInUser;
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield getUsers();
        yield getCurrentlyLoggedInUser();
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
});
main();
