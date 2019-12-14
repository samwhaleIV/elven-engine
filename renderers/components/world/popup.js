import { TextSound } from "../../../runtime/tones.js";

function applySonographToPopupFeed(popupFeed) {
    let even = false;
    for(let i = 0;i<popupFeed.length;i++) {
        popupFeed[i].noSound = even;
        even = !even;
    }
    return popupFeed;
}

function WorldPopup(pages,callback,prefix,isInstant=false,instantSound=true,autoCallback) {

    prefix = prefix ? prefix : "";

    const characterSpeed = 30;
    const spaceSpeed = characterSpeed;

    const hyphenDelay = 200;
    const commaDelay = 300;
    const periodDelay = 500;
    const ellipsisDelay = 600;

    let pageIndex = 0;
    let characterIndex = 0;

    const pageCount = pages.length;
    let pageComplete = false;

    let terminated = false;
    this.readyToTerminate = false;

    for(let i = 0;i<pages.length;i++) {
        let page = pages[i];
        const newPage = [];
        page = page.replace(/\.\.\./gi,ellipsis);
        const processedFullText = processTextForWrapping(prefix + page);
        if(isInstant) {
            newPage.push({
                textFeed:processTextForWrappingLookAhead(page,processedFullText),
                newCharacter:null,
                noSound:false,
                instant:true,
                speed:0,
                delay:0
            });
            pages[i] = newPage;
            continue;
        }
        let textFeed = prefix;
        let lastCharacterInstant = false;
        for(let x = 0;x<page.length;x++) {
            let speed = characterSpeed;
            let instant = false;
            const character = page[x];
            let delay = 0;
            textFeed += character;
            switch(character) {
                case ellipsis:
                    delay = ellipsisDelay;
                    break;
                case " ":
                    speed = spaceSpeed;
                    break;
                case "-":
                    speed = hyphenDelay;
                    break;
                case "*":
                case "'":
                case '"':
                    if(lastCharacterInstant) {
                        instant = true;
                    }
                    break;
                case ",":
                    delay = commaDelay;
                    break;
                case "!":
                case "?":
                case ".":
                case ":":
                    delay = periodDelay;
                    instant = true;
                    break;
            }
            lastCharacterInstant = instant;
            newPage.push({
                textFeed:processTextForWrappingLookAhead(textFeed,processedFullText),
                newCharacter:character,
                noSound:true,
                instant:instant,
                delay:delay,
                speed:speed
            });
        }

        pages[i] = applySonographToPopupFeed(newPage);
    }

    this.textFeed = [];
    let timeout = -1;
    let lastTextSoundTime = 0;

    const playTextSound = () => {
        TextSound();
        lastTextSoundTime = performance.now();
    }
    const playAutoCompleteTextSound = () => {
        const now = performance.now();
        const timeDifference = now - lastTextSoundTime;
        const delay = Math.max(characterSpeed*2-timeDifference,0);
        if(delay) {
            setTimeout(playTextSound,delay);
        } else {
            playTextSound();
        }
    }

    let timeoutMethod = () => {
        const pageValue = pages[pageIndex][characterIndex];
        this.textFeed = pageValue.textFeed;
        if(++characterIndex < pages[pageIndex].length) {
            const lookAhead = pages[pageIndex][characterIndex];
            if(lookAhead) {
                if(lookAhead.instant) {
                    if(!pageValue.delay && !pageValue.noSound) {
                        playTextSound();
                    }
                    timeoutMethod();
                    return;
                }
            }
            if(pageValue.delay) {
                timeout = setTimeout(timeoutMethod,pageValue.delay);
            } else {
                if(!pageValue.noSound) {
                    playTextSound();
                }
                timeout = setTimeout(timeoutMethod,pageValue.noSound ? pageValue.speed / 2 : pageValue.speed);
            }
        } else {
            if(isInstant && instantSound) {
                playTextSound();
            }
            if(pageIndex + 1 >= pageCount) {
                this.readyToTerminate = true;
                if(autoCallback) {
                    autoCallback();
                }
            }
            pageComplete = true;
        }
    }

    timeoutMethod();
    this.progress = () => {
        clearTimeout(timeout);
        if(this.readyToTerminate) {
            if(terminated) {
                return;
            }
            terminated = true;
            if(callback) {
                callback();
            }
            return;
        }
        if(pageComplete) {
            pageIndex++;
            characterIndex = 0;
            if(pageIndex >= pageCount) {
                this.readyToTerminate = true;
            } else {
                pageComplete = false;
                timeoutMethod();
            }
        } else {
            playAutoCompleteTextSound();
            const page = pages[pageIndex];
            this.textFeed = page[page.length-1].textFeed;
            pageComplete = true;
            if(pageIndex + 1 >= pageCount) {
                this.readyToTerminate = true;
            }
        }
    }
    this.startY = 0;

    const textScale = 4;
    this.render = () => {
        if(terminated) {
            return;
        }
        
        const popupWidth = Math.min(800,fullWidth-20);
        const popupHeight = Math.min(300,fullHeight-20);

        const popupY = fullHeight - 10 - popupHeight;
        const popupX = Math.round(halfWidth - popupWidth / 2);
        this.startY = popupY;

        context.fillStyle = "white";
        context.fillRect(
            popupX,
            popupY,
            popupWidth,popupHeight
        );
        BitmapText.drawTextWrappingLookAheadBlack(
            this.textFeed,popupX + 20,
            popupY + 20,
            popupWidth-40,
            textScale
        );
    }
}
export default WorldPopup;
