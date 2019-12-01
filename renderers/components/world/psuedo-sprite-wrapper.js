function PsuedoSpriteWrapper(world,spriteType,...additionalParameters) {
    return function(...parameters) {
        if(additionalParameters.length) {
            parameters = parameters.concat(additionalParameters);
        }
        spriteType.apply(this,parameters);
        this.move = async (...steps) => await world.moveSprite(this.ID,steps);
        this.say = world.showPopup;
        this.alert = () => {
            throw Error("Psuedo sprites don't support the alert action!");
        }
        this.setWalking = () => void undefined;
        this.updateDirection = () => void undefined;
    }
}
export default PsuedoSpriteWrapper;
