import { Start } from './scenes/Start.js';

const config = {
    type: Phaser.AUTO,
    title: 'PS',
    parent: 'game-container',
    width: 1280,
    height: 720,
    pixelArt: true,
    scene: [
        Start
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}
new Phaser.Game(config);
            