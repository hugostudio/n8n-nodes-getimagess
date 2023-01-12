const gm = require("gm").subClass({
  imageMagick: true,
  // appPath: "D:\\Automatic Content Creator\\Resources\\Program\\ImageMagick-7.1.0-Q16-HDRI"
});
const { join } = require("path");
const fs = require("fs");
const { getRandomIntInclusive } = require("./tools.js.js");

async function cropImage(inputFile, width, height, outputFile) {
  return new Promise((resolve, reject) => {
    //const input = `${inputFile}[0]`;
    const input = inputFile;
    const output = outputFile;

    gm(input)
      .crop(width, height, 0, 0)
      .write(output, error => {
        if (error) {
          return reject(error);
        }
        resolve();
      });

  });
}

async function createEbookCover(imageBackground, title, pathCover, log = false) {
  if (log) {
    console.log("Inicio [image_tools.createEbookCover]");
    console.log("Background Image [%s]", imageBackground);
    console.log("Title [%s]", title);
  }

  new Promise((resolve, reject) => {
    const inputFile = imageBackground;
    const outputFile = `${pathCover}/ebook-cover.jpg`;
    const width = 595;
    const height = 842;

    backgroundColors = ["#F20505", "#D9CB04", "#F25C05"];

    gm()
      .in(inputFile)
      .out("-resize", `${width}x${height}^`)
      .out("-gravity", "center")
      .out("-crop", `${width}x${height}+0+0`)

      // // cortina
      .out("-size", `${width}x${height}`)
      .out("-fill", backgroundColors[getRandomIntInclusive(0, backgroundColors.length - 1)])
      .out("-colorize", "90%")

      // texto
      .out("(")
      .out("-background", "none")
      .out("-gravity", "center")
      .out("-font", "D:/Automatic Content Creator/Resources/Fonts/AmaticSC-Regular.ttf")
      .out("-pointsize", "120")
      .out("-interline-spacing", "-40")
      .out("-fill", "white")
      .out("-kerning", "-4")
      .out(`caption:${title.toUpperCase()}`)
      .out("-trim")
      .out("+repage")
      .out(")")

      // // sombra
      .out("(")
      .out("-clone", "1")
      .out("-background", "black")
      .out("-shadow", "30x3+0+1")
      .out(")")

      .out("(")
      .out("-clone", "1")
      .out("-clone", "2")
      .out("+swap")
      .out("-background", "none")
      .out("-layers", "merge")
      .out("+repage")
      .out(")")

      .out("-delete", "1,2")

      .out("-gravity", "center")
      .out("-compose", "over")
      .out("-composite")

      .write(outputFile, error => {
        if (error) {
          return reject(error);
        }

        if (log) {
          console.log("Cover gerado com sucesso [%s]", outputFile);
        }

        resolve();
      });
  });

  if (log) {
    console.log("Fim [image_tools.createEbookCover]");
  }
}

// async function createAllEbookCover(content_path, level_filter = "", log = false) {
//   if (log) {
//     console.log("Inicio [image_tools.createAllEbookCover]");
//   }

//   const dataPath = join(content_path, "Data");

//   // lendo o arquivo data.json de cada diretório
//   const directories = fs
//     .readdirSync(dataPath, { withFileTypes: true })
//     .filter(dirent => dirent.isDirectory() && (level_filter == "" || level_filter == dirent.name))
//     .map(dirent => dirent.name);

//   for (dir of directories) {
//     let dirPath = join(dataPath, dir);

//     if (log) {
//       console.log("Analisando diretorio [%s]", dirPath);
//     }

//     // verifica se existe o arquivo data.json
//     if (fs.existsSync(join(dirPath, "Images/shutterstock")) || fs.existsSync(join(dirPath, "Images/gettyimages")) || fs.existsSync(join(dirPath, "Images/google"))) {
//       if (log) {
//         console.log("Processando [%s]", dirPath);
//       }

//       if (fs.existsSync(join(dirPath, "Images/shutterstock/1-original.jpg"))) {
//         backgroundImage = join(dirPath, "Images/shutterstock/1-original.jpg");
//       } else if (fs.existsSync(join(dirPath, "Images/gettyimages/1-original.jpg"))) {
//         backgroundImage = join(dirPath, "Images/gettyimages/1-original.jpg");
//       } else if (fs.existsSync(join(dirPath, "Images/google/1-original.png"))) {
//         backgroundImage = join(dirPath, "Images/google/1-original.png");
//       }

//       if (log) {
//         console.log("Background Image [%s]", backgroundImage);
//       }

//       let cover = new Promise((resolve, reject) => {
//         const inputFile = backgroundImage;
//         const outputFile = `${dirPath}/Images/ebook-cover.jpg`;
//         const width = 595;
//         const height = 842;

//         backgroundColors = ["#1DDDF2", "#D9CB04", "#F25C05"];

//         textTitle = "DIETA PARA ENGORDAR COM SAÚDE";

//         gm()
//           .in(inputFile)
//           .out("-resize", `${width}x${height}^`)
//           .out("-gravity", "center")
//           .out("-crop", `${width}x${height}+0+0`)

//           // // cortina
//           .out("-size", `${width}x${height}`)
//           .out("-fill", backgroundColors[getRandomIntInclusive(0, backgroundColors.length - 1)])
//           .out("-colorize", "50%")

//           // texto
//           .out("(")
//           .out("-background", "none")
//           .out("-gravity", "center")
//           .out("-font", "arial")
//           .out("-pointsize", "60")
//           .out("-fill", "white")
//           .out("-kerning", "-4")
//           .out(`caption:${textTitle}`)
//           .out("-trim")
//           .out("+repage")
//           .out(")")

//           // sombra
//           .out("(")
//           .out("-clone", "1")
//           .out("-background", "black")
//           .out("-shadow", "30x3+0+5")
//           .out(")")

//           .out("(")
//           .out("-clone", "1")
//           .out("-clone", "2")
//           .out("+swap")
//           .out("-background", "none")
//           .out("-layers", "merge")
//           .out("+repage")
//           .out(")")

//           .out("-delete", "1,2")

//           .out("-gravity", "center")
//           .out("-compose", "over")
//           .out("-composite")

//           .write(outputFile, error => {
//             if (error) {
//               return reject(error);
//             }

//             if (log) {
//               console.log("Cover gerado com sucesso [%s]", outputFile);
//             }

//             resolve(outputFile);
//           });
//       });
//     } else {
//       if (log) {
//         console.log("Não existe imagem [%s]", dirPath);
//       }
//     }
//   }

//   if (log) {
//     console.log("Fim [image_tools.createAllEbookCover]");
//   }
// }

module.exports = {
  createEbookCover,
  cropImage
};
