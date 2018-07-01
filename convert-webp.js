const webp = require('webp-converter');

//pass input image(.jpeg,.pnp .....) path ,output image(give path where to save and image file name with .webp extension)
//pass option(read  documentation for options)

for(let i = 1; i <= 10; i++){
    webp.cwebp(`public/img/${i}_sm.jpg`,`public/img/${i}_sm.webp`,"-q 80",function(status){
        console.log(status);
    });

    webp.cwebp(`public/img/${i}.jpg`,`public/img/${i}.webp`,"-q 80",function(status){
        console.log(status);
    });
}

webp.cwebp(`public/img/icons/128x128.png`,`public/img/icons/128x128.webp`,"-q 80",function(status){
    console.log(status);
});
webp.cwebp(`public/img/icons/512x512.png`,`public/img/icons/512x512.webp`,"-q 80",function(status){
    console.log(status);
});