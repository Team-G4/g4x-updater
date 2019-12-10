let zip = require("extract-zip")
let fs = require("fs")
let path = require("path")
let rimraf = require("rimraf")
let electron = require("electron")

let Octokit = require("@octokit/rest")
let gh = new Octokit()

let fetch = require("node-fetch")

let gameDir = path.join(__dirname, "game")
let gameZipPath = path.join(__dirname, "release.zip")
let versionFile = path.join(__dirname, "version.json")

function extractGameZip(path) {
    if (fs.existsSync(gameDir)) rimraf.sync(gameDir)
    zip(
        path, {
            dir: gameDir
        },
        (err) => {
            runGame()
        }
    )
}

async function getLatestRelease() {
    return (await gh.repos.listReleases({
        owner: "Team-G4",
        repo: "g4x"
    })).data[0]
}

async function checkUpdate() {
    try {
        let version = JSON.parse(
            fs.readFileSync(versionFile, "utf-8")
        )

        let ghRelease = await getLatestRelease()
        let lastUpdateDate, newUpdateDate

        newUpdateDate = new Date(ghRelease.published_at)

        if (!version.releaseTimestamp) {
            lastUpdateDate = new Date(0)
        } else {
            lastUpdateDate = new Date(version.releaseTimestamp)
        }

        if (newUpdateDate > lastUpdateDate || !fs.existsSync(gameDir)) {
            console.log("UPDATE TIME!")

            let asset = ghRelease.assets.find(a => a.name == "release.g4x")
            if (!asset) throw "No asset!!"
            
            let assetData = await fetch(asset.browser_download_url)
            assetData = await assetData.buffer()

            fs.writeFileSync(gameZipPath, assetData)

            version.releaseTimestamp = newUpdateDate
            version.justUpdated = true
            fs.writeFileSync(versionFile, JSON.stringify(version), "utf-8")

            extractGameZip(gameZipPath)
        } else {
            runGame()
        }
    } catch (e) {
        runGame()
    }
}

function runGame() {
    if (fs.existsSync(gameDir)) {
        require(path.join(gameDir, "main.js"))
    } else {
        electron.dialog.showErrorBox("G4X", "No game files found. Make sure you have a working internet connection.")
        process.exit()
    }
}

electron.app.on("ready", () => {
    checkUpdate()
})