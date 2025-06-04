# Assignment: Reverse engineering a legacy web application

### Tasks:

1. Login using the given credentials.
2. Get the list of all users and store them in a file called `users.json`.
3. Add the currently logged in user to the list of users.

### How each task is done:

#### Loggin in.

1. To log in we need to send a GET request to this url: `https://challenge.sunvoy.com/login`. And get the `nonce` code from the response given by the server in html format.

2. Make a POST request to this url: `https://challenge.sunvoy.com/login` with the credentials and the `nonce` code as the body.

3. Get the JSESSIONID from the response headers and store it in a variable.

#### Getting the list of users.

1. Make a POST request to this url: `https://challenge.sunvoy.com/api/users` with the JSESSIONID in the header.

2. Get the list of all the users and store them in a variable.

#### Adding the current user to the list of users.

1. Make a GET request to this url: `https://challenge.sunvoy.com/settings/tokens` with the JSESSIONID in the header.

2. From the response get the following values and store them in an object: `access_token`, `openId`, `userId`, `apiuser`, `operateId`, `language`.

3. Create a checkcode using the values of `access_token`, `openId`, `userId`, `apiuser`, `operateId`, `language` and the current timestamp.

4. Make a POST request to this url: `https://api.challenge.sunvoy.com/api/settings` with all the data and the check code in the body.

5. Get the response from the server and append the current user to the list of users and save the list of users in a file called `users.json`.
