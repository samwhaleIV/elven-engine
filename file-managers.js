"use strict";
const FileTypes = {
    None: Symbol("None"),
    Sound: Symbol("Sound"),
    Music: Symbol("Music"),
    Image: Symbol("Image"),
    BackgroundImage: Symbol("BackgroundImage"),
    Renderer: Symbol("Renderer"),
    RendererComponent: Symbol("RendererComponent"),
}
const IndexModes = {
    NameOnly: Symbol("NameOnly"),
    LoseRoot: Symbol("LoseRoot")
}
function validIndexMode(mode) {
    switch(mode) {
        case IndexModes.LoseRoot:
            return true;
        case IndexModes.NameOnly:
            return true;
        default:
            return false;
    }
}
let customSector = "elven-custom";
function setCustomFileSector(sectorName) {
    customSector = sectorName;
}
let imageIndexMode = IndexModes.NameOnly;
function setImageIndexMode(mode) {
    if(!validIndexMode(mode)) {
        console.error("Unknown image indexing mode");
        return;
    }
    imageIndexMode = mode;
}
function getFile(path,type,isCustom=true) {
    let engineSector = isCustom ? customSector : "../elven-engine";
    switch(type) {
        case FileTypes.None:
        default:
            return `${engineSector}/${path}`;
        case FileTypes.Renderer:
            return `${engineSector}/renderers/${path}`;
        case FileTypes.RendererComponent:
            return `${engineSector}/renderers/components/${path}`;
        case FileTypes.Sound:
            return `${engineSector}/audio/${path}`;
        case FileTypes.Music:
            return `${engineSector}/audio/music/${path}.${MUSIC_FILE_FORMAT}`;
        case FileTypes.Image:
            return `${engineSector}/images/${path}`;
        case FileTypes.BackgroundImage:
            return `${engineSector}/images/backgrounds/${path}`;
    }
}
const imageDictionary = {};
const SoundManager = {
    soundsLoaded: false,
    loadSounds: callback => {
        let loadedSounds = 0;
        const soundProcessed = () => {
            if(++loadedSounds === EssentialSounds.length) {
                console.log("Sound manager: All sounds loaded");
                SoundManager.soundsLoaded = true;
                callback();
            }
        }
        EssentialSounds.forEach(value => addBufferSource(value,soundProcessed,soundProcessed));
    },
    loadNonEssentialSounds: () => {
        NonEssentialSounds.forEach(value => addBufferSource(value));
    },
    loadOnDemand: path  => {
        addBufferSource(path);
    }
}
const ImageManager = {
    imagesLoaded: false,
    loadImages: callback => {
        let loadedImages = 0;
        for(let i = 0;i<ImagePaths.length;i++) {
            const image = new Image();
            (image=>{
                image.onload = async () => {
                    let name;
                    switch(imageIndexMode) {
                        default:
                        case IndexModes.NameOnly: {
                                const sourcePath = image.src.split("/");
                                const fileName = sourcePath[sourcePath.length-1].split(".");
                                name = fileName[fileName.length-2];
                            }
                            break;
                        case IndexModes.LoseRoot: {
                                const sourcePath = image.src.split("/");
                                let startIndex;
                                for(startIndex = 0;startIndex<sourcePath.length;startIndex++) {
                                    if(sourcePath[startIndex] === "images") {
                                        const dotSplit = sourcePath[sourcePath.length-1].split(".");
                                        sourcePath[sourcePath.length-1] = dotSplit[0];
                                        name = sourcePath.slice(startIndex+1).join("/");
                                        break;
                                    }
                                }
                            }
                            break;
                    }
                    const settings = Object.assign({
                        resizeWidth: image.width,
                        resizeHeight: image.height
                    },IMAGE_TO_BITMAP_SETTINGS);
                    const bitmap = await createImageBitmap(
                        image,0,0,image.width,image.height,settings
                    );
                    bitmap.name = name;
                    imageDictionary[name] = bitmap;
                    if(++loadedImages === ImagePaths.length) {
                        console.log("Image manager: All images loaded and converted to bitmaps");
                        ImageManager.imagesLoaded = true;
                        callback();
                    }
                };
            })(image);
            image.src = ImagePaths[i];
        }
    }
}
function loadSongOnDemand(fileName,fileType=MUSIC_FILE_FORMAT) {
    SoundManager.loadOnDemand(`${customSector}/audio/music/${fileName}.${fileType}`);
}
