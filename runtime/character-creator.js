const CharacterSpriteLookup = CharacterData.SpriteLookup;
const CharacterDisplayNames = CharacterData.DisplayNames;
const CharacterColors = CharacterData.Colors;
const CharacterMakers = CharacterData.Makers;

const typeNameLookup = {
    "elf": ElfCharacterMaker,
    "default": DefaultCharacterMaker,
    "custom-size": CustomSizeCharacterMaker
}
function AddMakerType(typeName,maker) {
    typeNameLookup[typeName] = maker;
}
const ColorLookup = {};
Object.entries(textColorLookup).forEach(entry => {
    ColorLookup[entry[1]] = entry[0];
});
delete ColorLookup[0];
function processMakerTypeName(name) {
    const makerType = typeNameLookup[name];
    if(!makerType) {
        throw Error(`Maker type '${name}' is not a valid character maker type`);
    } else {
        return makerType;
    }
}
function getSpriteName(characterName) {
    const spriteName = CharacterSpriteLookup[characterName];
    if(spriteName) {
        return spriteName;
    } else {
        return characterName;
    }
}
function applyPopupAttributes(character,characterName) {
    character.prefix = getPrefix(characterName);
    character.characterName = characterName;
}
function DefaultCharacterMaker(world,characterName,direction,isElf=false) {
    const spriteName = getSpriteName(characterName);
    const character = new (isElf ? world.elfSprite:world.sprite)(direction,spriteName);
    applyPopupAttributes(character,characterName);
    return character;
};
function ElfCharacterMaker(world,characterName,direction) {
    return DefaultCharacterMaker(world,characterName,direction,true);
};
function CustomSizeCharacterMaker(world,characterName,direction,width,height) {
    const spriteName = getSpriteName(characterName);
    const character = new world.sprite(direction,spriteName,width,height);
    applyPopupAttributes(character,characterName);
    return character;
};
function getColorCode(characterName) {
    const color = CharacterColors[characterName];
    if(!color) {
        throw Error(`Text name color not found for '${characterName}'`);
    }
    const colorCode = ColorLookup[color];
    if(!colorCode) {
        throw Error(`Color '${color}' is an invalid text rendering color`)
    }
    return colorCode;
};
function getPrefix(characterName) {
    const colorCode = getColorCode(characterName);
    let displayName = CharacterDisplayNames[characterName];
    if(!displayName) {
        displayName = characterName;
    }
    return `${colorCode}${displayName}:${colorCode} `;
};
function getColoredName(characterName) {
    const colorCode = getColorCode(characterName);
    let displayName = CharacterDisplayNames[characterName];
    if(!displayName) {
        displayName = characterName;
    }
    return `${colorCode}${displayName}${colorCode}`;
};
function getPrefixMask(character,maskedName) {
    if(!character.characterName) {
        throw Error(`A character with a masked name must also have a real name. Everyone needs a true identity`);
    }
    const colorCode = getColorCode(character.characterName);
    return `${colorCode}${maskedName}:${colorCode} `;
};
function getSpeakingPrefix(character,customPrefix) {
    return customPrefix ? getPrefixMask(character,customPrefix) : character.prefix;
};
async function speakMethod(world,character,message,customPrefix) {
    const prefix = getSpeakingPrefix(character,customPrefix);
    await world.showNamedPopup(message,prefix);
};
async function speakMethod_multiple(world,character,messages,customPrefix) {
    const prefix = getSpeakingPrefix(character,customPrefix);
    await world.showNamedPopups(messages,prefix);
};
function GetOverworldCharacterSpriteless(world,name) {
    const character = {};
    character.prefix = getPrefix(name);
    character.characterName = name;
    character.coloredName = getColoredName(name);
    character.say = async (message,customPrefix=null) => {
        await speakMethod(world,character,message,customPrefix);
    }
    character.speech = async (messages,customPrefix=null) => {
        await speakMethod_multiple(world,character,messages,customPrefix);
    }
    return character;
}
function GetOverworldCharacter(world,name,direction=null,spriteLess=false) {
    if(spriteLess) {
        return GetOverworldCharacterSpriteless(world,name);
    }
    const characterMaker = processMakerTypeName(CharacterMakers[name]);
    if(!characterMaker) {
        throw Error(`Character '${name}' does not exist`);
    }
    const character = characterMaker(world,name,direction);
    character.say = async (message,customPrefix=null) => {
        await speakMethod(world,character,message,customPrefix);
    }
    character.speech = async (messages,customPrefix=null) => {
        await speakMethod_multiple(world,character,messages,customPrefix);
    }
    character.move = async (...steps) => {
        await world.moveSprite(character.ID,steps);
    }
    character.coloredName = getColoredName(name);
    return character;
}
export default GetOverworldCharacter;
export {GetOverworldCharacter, AddMakerType};
