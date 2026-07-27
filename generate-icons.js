const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

const sourceImage = 'niuniu.png';
const resDir = 'android/app/src/main/res';

async function generateIcons() {
    for (const [folder, size] of Object.entries(sizes)) {
        const outputDir = path.join(resDir, folder);
        
        // 生成方形图标
        await sharp(sourceImage)
            .resize(size, size)
            .toFile(path.join(outputDir, 'ic_launcher.png'));
        
        // 生成圆形图标
        const roundedCorners = Buffer.from(
            `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></svg>`
        );
        await sharp(sourceImage)
            .resize(size, size)
            .composite([{
                input: roundedCorners,
                blend: 'dest-in'
            }])
            .toFile(path.join(outputDir, 'ic_launcher_round.png'));
        
        // 生成前景图标 (稍大一些用于自适应图标)
        const foregroundSize = Math.round(size * 1.5);
        await sharp(sourceImage)
            .resize(foregroundSize, foregroundSize)
            .extend({
                top: Math.round((size * 2 - foregroundSize) / 2),
                bottom: Math.round((size * 2 - foregroundSize) / 2),
                left: Math.round((size * 2 - foregroundSize) / 2),
                right: Math.round((size * 2 - foregroundSize) / 2),
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .resize(size, size)
            .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
        
        console.log(`Generated icons for ${folder} (${size}x${size})`);
    }
    console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
