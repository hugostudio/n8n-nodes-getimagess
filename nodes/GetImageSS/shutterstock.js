const cheerio = require("cheerio");
const rp = require("request-promise");
const jsonFile = require("./jsonFile.js.js");
const fs = require("fs");
const { join } = require("path");
const imageDownloader = require("image-downloader");
const image_tools = require("./image_tools.js");


/**
 * //instalação do  graphicsmagick / imagemagick
 * sudo add-apt-repository ppa:dhor/myway
 * sudo apt-get update
 * sudo apt-get install graphicsmagick
 * sudo apt-get install imagemagick} contents_path
 */

async function execute(contents_path, content_filter, level_filter, log) {
  // let blackList = jsonFile.load(join(contents_path, "black_list.json")); // carrega a black list

  // lendo os conteudos (pastas)
  const contents = fs
    .readdirSync(contents_path, { withFileTypes: true })
    .filter((e) => e.isDirectory() && (content_filter == "" || content_filter.toLowerCase() == e.name.toLowerCase()))
    .map((e) => e.name);

  // percorrendo os conteudos (sub-pastas em Data)
  for (let content of contents) {
    const dataPath = join(contents_path, content, "Data");

    // lendo o arquivo data.json de cada diretório
    const directories = fs
      .readdirSync(dataPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && (level_filter == "" || level_filter == e.name))
      .map((e) => e.name);

    for (dir of directories) {
      let dirPath = join(dataPath, dir);
      let pathDataJson = join(dirPath, "data.json");

      if (log) {
        console.log("Analisando diretorio [%s]", dirPath);
      }

      // verifica se existe o arquivo data.json
      if (fs.existsSync(pathDataJson)) {
        // verifica se existe imagens da Shutterstock
        //if (!fs.existsSync(join(dirPath, "Images/shutterstock"))) {
          // verifica se existe imagens da Gettyimages
          //if (!fs.existsSync(join(dirPath, "Images/gettyimages"))) {
            // verifica se existe imagens do Google
            //if (!fs.existsSync(join(dirPath, "Images/google"))) {
              if (log) {
                console.log("Processando [%s]", pathDataJson);
              }

              let data = jsonFile.load(pathDataJson); // carrega os dados

              // // Verifica se a url está na black list
              // if (
              //   blackList.hosts.findIndex(function (hostBL) {
              //     return data.url.toLowerCase().search(hostBL.toLowerCase()) > -1;
              //   }) == -1
              // ) {

              let images = await fetchImages(data);

              if (log) {
                console.log("> Quantidade de imagens encontradas [%d]", images.length);
              }

              let imagesDownloadeds = [];
              if (images.length > 0) {
                imagesDownloadeds = await downloadAllImages(images, dirPath);
              }

              if (imagesDownloadeds.length > 0) {
                await cropImages(imagesDownloadeds);
              }

              // } else {
              //   if (log) {
              //     console.log("Host em Black List [%s]", data.url);
              //   }
              // }

              // } else {
              //   if (log) {
              //     console.log('Já possui imagens do Google [%s]', join(dirPath, 'Images/google'));
              //   }
           // }
            // } else {
            //   if (log) {
            //     console.log('Já possui imagens da Gettyimages [%s]', join(dirPath, 'Images/gettyimages'));
            //   }
         // }
          // } else {
          //   if (log) {
          //     console.log('Já possui imagens da Shutterstock [%s]', join(dirPath, 'Images/shutterstock'));
          //   }
        //}
      } else {
        if (log) {
          console.log("Arquivo não existe [%s]", pathDataJson);
        }
      }
    }
  }

  async function fetchImages(data) {
    // contar as sentenças
    let qtdSentencas = 1; // começa em 1 por conta do titulo
    for (let e = 0; e < data.elements.length; e++) {
      if (data.elements[e].type != "table") {
        if (data.elements[e].type == "ul" || data.elements[e].type == "ol") {
          for (let nLi = 0; nLi < data.elements[e].items.length; nLi++) {
            qtdSentencas += data.elements[e].items[nLi].sentences.length;
          }
        } else {
          qtdSentencas += data.elements[e].sentences.length;
        }
      }
    }

    const sKeyword = data.title.keyword.toLowerCase();

    if (log) {
      console.log("> Palavra chave [%s]", sKeyword);
      console.log("> Quantidade de imagem esperada (sentenças) [%d]", qtdSentencas);
    }
    const sUrl = `https://www.shutterstock.com/en/search/${encodeURI(sKeyword)}?search_source=base_landing_page&orientation=horizontal&image_type=photo&mreleased=true`;
    const options = {
      uri: sUrl,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36", // optional headers
      },
      transform: function (body) {
        return cheerio.load(body);
      },
    };
    let images = await scraperImagesPage(options, qtdSentencas);
    return images;
  }

  async function scraperImagesPage(options, max) {
    return new Promise((_resolve, _reject) => {
      rp(options)
        .then(($) => {
          const aListImages = $("a[href*='/image-photo/']");
          var aImagesFounded = [];
          for (let i = 0; i < aListImages.length; i++) {
            const a = aListImages[i];
            const aHref = a.attribs.href.split("-");
            aHref[aHref.length - 2] = "260nw";
            const sLink = "https://image.shutterstock.com" + aHref.join("-") + ".jpg";
            // Pego o link do href porque os links das imagens só são carregadas quando navega para baixo na página
            // Na página o link está assim
            // /image-photo/muslim-woman-doing-sport-exercise-daughter-1938276298
            // Transformo para esse link
            // https://image.shutterstock.com/image-photo/muslim-woman-doing-sport-exercise-260nw-1938276298.jpg
            aImagesFounded.push(sLink);
            if (aImagesFounded.length == max) {
              break;
            }
          }
          _resolve(aImagesFounded);
        })
        .catch((err) => {
          console.log(err);
          _reject(err);
        });
    });
  }

  async function downloadAllImages(images, path) {
    let urlImagesDownloadeds = [];
    let imagesDownloadeds = [];
    let filePath = join(path, "Images");
    if (!fs.existsSync(filePath)) {
      // criando o diretório
      fs.mkdirSync(filePath);

      if (log) {
        console.log("> Diretório criado [%s]", filePath);
      }
    }

    filePath = join(path, "Images/shutterstock");
    if (!fs.existsSync(filePath)) {
      // criando o diretório
      fs.mkdirSync(filePath);

      if (log) {
        console.log("> Diretório criado [%s]", filePath);
      }
    } else {
      if (log) {
        console.log("> Diretório destino [%s]", filePath);
      }
    }

    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      let imageUrl = images[imageIndex];

      try {
        if (!urlImagesDownloadeds.includes(imageUrl)) {
          var imageName = `${imageIndex + 1}-original.jpg`;
          var imageDownloaded = await downloadAndSave(imageUrl, filePath, imageName);
          imagesDownloadeds.push(imageDownloaded);
          urlImagesDownloadeds.push(imageUrl);
        }
      } catch (error) {
        if (log) {
          console.log(`Erro [${imageName}] (${imageUrl}): ${error}`);
        }
      }
    }
    return imagesDownloadeds;
  }

  async function cropImages(images) {
    // recortar as imagens para tirar a identificação
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      try {
        var imageName = images[imageIndex];

        await image_tools.cropImage(imageName, 390, 260, imageName);

        if (log) {
          console.log(">>> Cortada [%s]", imageName);
        }
      } catch (error) {
        console.log(`Erro [${imageName}]: ${error}`);
      }
    }
  }

  async function downloadAndSave(url, filePath, fileName) {
    return imageDownloader
      .image({
        url: url,
        dest: join(filePath, fileName),
      })
      .then(({ filename }) => {
        if (log) {
          console.log(">> Sucesso [%s]", filename);
        }
        return filename;
      });
  }
}

async function queue(root, path_data, log) {
  const contents_path = join(root, path_data);
  let content_filter = "";
  let level_filter = "";
  let queueJson = jsonFile.load(join(contents_path, "queue.json"));
  // verifica se tem filtro para os projetos
  for (let q = 0; q < queueJson.length; q++) {
    let queue = queueJson[q];
    content_filter = queue.project;
    // verifica se tem filtro para os levels
    for (let l = 0; l < queue.levels.length; l++) {
      level_filter = queue.levels[l];
      await execute(contents_path, content_filter, level_filter, log);
    }
    // executa para todos os levels
    if (queue.levels.length == 0) {
      await execute(contents_path, content_filter, level_filter, log);
    }
  }
  // executa para todos os projetos
  if (queueJson.length == 0) {
    await execute(contents_path, content_filter, level_filter, log);
  }
}

async function download(root, path_data, log = false) {
  if (log) {
    console.log("");
    console.log("******************************");
    console.log("INÍCIO [shutterstock.download]");
    console.log("------------------------------");
  }

  await queue(root, path_data, log);

  if (log) {
    console.log("---------------------------");
    console.log("FIM [shutterstock.download]");
    console.log("***************************");
  }
}

module.exports = {
  download,
};
