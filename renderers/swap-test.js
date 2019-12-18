import PaletteSwap from "./components/palette-swap.js";

function SwapTestRenderer() {
    const paletteSwap = new PaletteSwap(
        imageDictionary["swap-test"]
    );

    const colorCount = 4;
    let image = null;

    const colors = [
        "red","orange","blue","green","yellow","magenta","purple","pink"
    ];
    const randomColor = () => selectRandomEntry(colors);
    const randomPalette = (size=colorCount) => {
        const array = new Array(size);
        for(let i = 0;i<size;i++) {
            array[i] = randomColor();
        }
        return array;
    }
    const palettes = [];
    for(let i = 0;i<20;i++) {
        palettes.push(randomPalette());
    }
    const randomSavedPalette = () => selectRandomEntry(palettes);
    (async ()=>{
        while(true) {
            image = paletteSwap.getSwapped(
                randomSavedPalette()
            );
            await delay(150);
        }
    })();
    this.render = () => {
        if(image === null) {
            return;
        }
        const size = 512;
        const halfSize = size / 2;
        context.drawImage(
            image,0,0,image.width,image.height,
            halfWidth-halfSize,halfHeight-halfSize,size,size
        );
    }
}
export default SwapTestRenderer;
