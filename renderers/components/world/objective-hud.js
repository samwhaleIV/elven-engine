const BOX_MARGIN = 15;
const DOUBLE_BOX_MARGIN = BOX_MARGIN * 2;
const TEXT_SCALE = 4;
const BORDER_WIDTH = 3;
const VERTICAL_EDGE_MARGIN = 7;
const LINE_WIDTH = BORDER_WIDTH * 2;

const BOX_Y = VERTICAL_EDGE_MARGIN + BORDER_WIDTH;
const TEXT_Y = VERTICAL_EDGE_MARGIN + BORDER_WIDTH + BOX_MARGIN;

function ObjectiveHUD(world,description,isNew) {
    let completed = false;
    const objectiveAdvanced = () => {
        playSound("energy");
    }
    let text;
    Object.defineProperty(this,"text",{
        set: function(value) {
            if(completed) {
                return;
            }
            if(text) {
                if(value !== text) {
                    objectiveAdvanced();
                }
            }
            text = value;
        }
    });
    if(isNew) {
        world.showInstantPopup("New objective: " + description);
    }
    this.markComplete = async(callback,noShow=false) => {
        if(completed) {
            return;
        }
        completed = true;
        if(!noShow) {
            await world.showInstantPopup("Objective completed!");
        }
        world.clearObjectiveHUD();
        if(callback) {
            await callback();
        }
    }
    this.getBottom = () => {
        return BOX_Y + BitmapText.drawTextTest("",TEXT_SCALE).height + DOUBLE_BOX_MARGIN;
    }
    this.render = () => {
        const textSize = BitmapText.drawTextTest(text,TEXT_SCALE);
        const boxX = Math.round(halfWidth - textSize.width / 2 - BOX_MARGIN);

        context.fillStyle = "white";
        context.strokeStyle = "black";
        context.lineWidth = LINE_WIDTH;
        
        context.beginPath();
        context.rect(
            boxX,
            BOX_Y,
            textSize.width + DOUBLE_BOX_MARGIN,
            textSize.height + DOUBLE_BOX_MARGIN
        );
        context.stroke();
        context.fill();

        BitmapText.drawTextBlack(text,boxX + BOX_MARGIN,TEXT_Y,TEXT_SCALE);
    }
}
export default ObjectiveHUD;
