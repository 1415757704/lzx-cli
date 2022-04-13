'use strict';

const semver = require('semver')

module.exports = {
    fetchNpmPgkInfo,
    getNpmPgkVersions,
    getNpmPgkLasterVerion,
    getDefaultRegistry
};

const axios = require('axios')
const { loadESM } = require('./utils')

async function fetchNpmPgkInfo(pgkName, npmOriginUrl) {
    npmOriginUrl = npmOriginUrl || 'https://registry.npm.taobao.org'
    const urlJoin = (await loadESM('url-join')).default

    const pgkUrl = urlJoin(npmOriginUrl, pgkName)

    return axios.get(pgkUrl).then((res) => {
        if (res.status === 200) return res.data
        return null
    }).catch(err => Promise.reject(err))
}

async function getNpmPgkVersions(pgkName, npmOriginUrl) {
    const data = await fetchNpmPgkInfo(pgkName, npmOriginUrl)
    try {
        return Object.keys(data.versions)
    } catch(err) {
        return []
    }
} 

async function getNpmPgkLasterVerion(pgkName, npmOriginUrl) {
    const versions = await getNpmPgkVersions(pgkName, npmOriginUrl || getDefaultRegistry())
    if (!versions || versions.length === 0) return null
   
    return versions.sort((a, b) => semver.gt(b, a))[0]
}

function getDefaultRegistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
  }