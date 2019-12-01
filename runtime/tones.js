function CloseSound() {
    playTone(100,1);
    setTimeout(playTone,80,80,1);
}
function OpenSound() {
    playTone(80,1);
    setTimeout(playTone,80,100,1);
}
function AlertSound() {
    playTone(799,1);
    setTimeout(playTone,80,800,1);
}
function SelectionChangeSound() {
    playTone(150,0.3);
}
function SelectionConfirmSound() {
    playTone(200,0.3);
}
function TextSound() {
    playTone(587.3295,0.3);
}
export { CloseSound,OpenSound,AlertSound,
    SelectionConfirmSound, SelectionChangeSound, TextSound
}
