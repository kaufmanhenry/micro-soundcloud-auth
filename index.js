require('dotenv').config();

const qs = require('qs');
const micro = require('micro');
const { router, get } = require('microrouter');
const redirect = require('micro-redirect');
const uid = require('uid-promise');

const soundcloudUrl = 'https://api.soundcloud.com/';

const states = [];

const { CLIENT_ID, CLIENT_SECRET, CLIENT_REDIRECT } = process.env;

const redirectWithQueryString = (res, data) => {
  const location = `${CLIENT_REDIRECT}?${qs.stringify(data)}`;
  redirect(res, 302, location);
};

const login = async (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET || !CLIENT_REDIRECT) {
    return console.error('In order to request an access token from slack, you must supply a CLIENT_ID, a CLIENT_SECRET, and a CLIENT_REDIRECT.');
  }
  
  const state = await uid(20);
  states.push(state);

  const qsParams = {
    client_id: CLIENT_ID,
    redirect_uri: 'http://localhost:3000/callback',
    scope: '*',
    response_type: 'code',
    state
  };

  const location = `${soundcloudUrl}connect?${qs.stringify(qsParams)}`;

  redirect(res, 302, location);
};

const callback = async (req, res) => {
 const { code, state } = req.query;

  if (!code || !state) {
    return redirectWithQueryString(res, {
      error: 'A response code and a state are required in order to authorize.'
    });
  }
  if (!states.includes(state)) {
    return redirectWithQueryString(res, {
      error: 'States must include the authorized state created in the login function.'
    });
  }
  
  const params = {
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: CLIENT_REDIRECT
  };

  return fetch(`${soundcloudUrl}oauth2/token`,{
    method: 'post',
    body: JSON.stringify(params)
  })
    .then((response) => {
      const data = qs.parse(response.data);

      return redirectWithQueryString(res, data);
    })
    .catch((err) => {
      console.error(err);
      return redirectWithQueryString(res, err);
    });
};