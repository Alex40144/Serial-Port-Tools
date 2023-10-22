import { useEffect } from 'react';
import { useRouter } from 'next/router';
import querystring from 'querystring';
import { Buffer } from 'buffer';
import type { GetServerSidePropsContext, GetServerSideProps } from 'next'

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const CLIENT_ID = 'e1ef6e76db754951ac5e97f222cc58b5';
const SCOPES = ['user-read-currently-playing'];

let REDIRECT_URI = '';
let host = ''

function base64URLEncode(buffer: Uint8Array) {
    return Buffer.from(buffer).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function sha256(buffer: BufferSource) {
    return crypto.subtle.digest('SHA-256', buffer);
}

async function generateCodeChallenge(codeVerifier: string) {
    const hash = await sha256(new TextEncoder().encode(codeVerifier));
    return base64URLEncode(new Uint8Array(hash));
}

async function getToken(code: string | string[]) {
    console.log('getting token')
    const codeVerifier = sessionStorage.getItem('code_verifier');
    const body = {
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
    };
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify(body)
    });
    const data = await response.json();
    console.log(data)
    console.log(sessionStorage.getItem('access_token'))
    if (sessionStorage.getItem('access_token') == 'undefined' || sessionStorage.getItem('access_token') == null || sessionStorage.length < 1) {
        sessionStorage.setItem('access_token', data.access_token);
    }
}

async function authorize() {
    const codeVerifier = base64URLEncode(crypto.getRandomValues(new Uint8Array(64)));
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('code_verifier', codeVerifier);
    const params = {
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        scope: SCOPES.join(' ')
    };
    const url = `${SPOTIFY_AUTH_ENDPOINT}?${querystring.stringify(params)}`;
    window.location.href = url;
}

export const getServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    const { req } = context;
    let url = req.headers.host;
    return { props: { url } }
}

export default function SpotifyAuth({ url }: { url: string }) {
    const router = useRouter();
    REDIRECT_URI = 'http://' + url + '/SpotifyAuth'
    console.log(REDIRECT_URI)
    useEffect(() => {
        if (!router.isReady) return;
        console.log(router.query)
        const { code } = router.query;
        if (code) {
            getToken(code);
            router.push('/');
        } else {
            authorize();
        }
    }, [router]);

    return null;
}
