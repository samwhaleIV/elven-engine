let steamworks = null;
let steamworksLoaded = false;

function setAchievement(ID) {
    if(steamworksLoaded) {
        steamworks.activateAchievement(ID,()=>{
            console.log(`Steam helper: Successfully set achievement '${ID}'`);
        },()=>{
            console.warn(`Steam helper: Failed to set achievement '${ID}'`);
        });
    } else {
        console.log(`Steam helper: Achievement '${ID}' activated (this is a null event)`);
    }
}
function steamSetup() {
    if(typeof(require) !== "undefined") {
        const os = require("os");
        try {
            steamworks = require("greenworks");
        } catch(exception) {
            steamworks = require("../../greenworks");
        }
        if(steamworks) {
            let initialized = false;
            try {
                initialized = steamworks.init();
            } catch(exception) {
                alert(exception);
                window.close();
            }
            if(initialized) {
                steamworksLoaded = true;
                console.log("Steam helper: Steamworks initialized");
            } else {
                console.warn("Steam helper: Could not initialize steamworks");
            }
        } else {
            console.log(`Steam helper: Greenworks is not supported on platform '${os.platform()}'`);
        }
    } else {
        console.log("Steam helper: Electron not detected");
    }
}
