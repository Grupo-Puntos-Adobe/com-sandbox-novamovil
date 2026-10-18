const fs = require('fs');
const fse = require('fs-extra');
const convert = require('xml-js');
const glob = require('glob');
const { mdToPdf } = require('md-to-pdf');

const componentsPath = '../blocks';
const componentsResourcePathSrc = '../documentation/readme';
const componentsResourcePathDst = './pdf/clientlibs';
const baseDocumentation = '../documentation';
const pdfPath = './pdf/';
const finalFileName = 'Documentacion';
const mdBreakpage = '\n\n<div style="page-break-after: always; visibility: hidden">\pagebreak</div>\n\n';

async function init() {
  console.log('=============================================================');
  console.log('=> Limpiando archivos de ejecuciones anteriores');
  await deletePDFFiles();
  console.log('=> Agregando recursos');
  await copyResources(componentsResourcePathSrc, componentsResourcePathDst);
  console.log('=> Agregando MD base al archivo final');
  await copyMDFiles(baseDocumentation, `${pdfPath + finalFileName}.md`);
  console.log('=> Agregando indice');
  await generateIndexFile(componentsPath, `${pdfPath + finalFileName}.md`);
  console.log('=> Agregando MD componentes al archivo final');
  await copyMDFiles(componentsPath, `${pdfPath + finalFileName}.md`);
  console.log('=> Generando PDF');
  await generatePdfFile();
  console.log('=> Eliminando recursos');
  await deleteExtraFiles();
  console.log('=============================================================');
  return 0;
}

async function copyMDFiles(srcDirPath, dscFilePath) {
  console.log(`   Buscando en: ${srcDirPath}`);
  glob(`${srcDirPath}/**/*.md`, async (err, files) => {
    if (err) return;
    for (const file of files) {
      console.log(`   - ${file.replace(`${srcDirPath}/`, '')}`);
      try {
        let data = fs.readFileSync(file, 'utf8');
        data = data.replaceAll(
          '/documentation/readme/',
          'clientlibs/',
        );
        fs.appendFileSync(dscFilePath, data);
        fs.appendFileSync(dscFilePath, mdBreakpage);
      } catch (err) {
        return '';
      }
    }
  });
}

async function deleteExtraFiles() {
  fs.rmSync(componentsResourcePathDst, {
    force: true,
    recursive: true,
  });
}
function deletePDFFiles() {
  console.log('   Eliminando archivos MD');
  fs.rmSync(`${pdfPath}/${finalFileName}.md`, {
    force: true,
    recursive: true,
  });
  console.log('   Eliminando archivos PDF');
  fs.rmSync(`${pdfPath}/${finalFileName}.pdf`, {
    force: true,
    recursive: true,
  });
}

async function copyResources(srcDir, destDir) {
  // To copy a folder or file, select overwrite accordingly
  try {
    fse.copySync(srcDir, destDir, { overwrite: true | false });
    console.log('success!');
  } catch (err) {
    console.error(err);
  }
}

async function generatePdfFile() {
  const mdFile = `${pdfPath + finalFileName}.md`;
  const pdf = await mdToPdf({
    path: mdFile,

  }, {
    document_title: 'Citibanamex | AEM | Partners - Documentación de componentes',
    stylesheet: './pdf.css',
    launch_options: {
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox'],
    },
    pdf_options: {
      format: 'A4',
      displayHeaderFooter: true,
      headerTemplate: "<div style=\"font-size: 9px; margin-left: 1cm;\"> <span class='title'></span></div>",
      footerTemplate: "<div style=\"font-size: 9px; margin: 0 auto;\"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>",

    },
  }).catch(console.error);
  if (pdf) {
    fs.writeFileSync(`${pdfPath + finalFileName}.pdf`, pdf.content);
  }
}

async function generateIndexFile(srcDirPath, dscFilePath) {
  glob(`${srcDirPath}/**/*.md`, async (err, files) => {
    if (err) return;
    fs.appendFileSync(dscFilePath, '\n## Listado de componentes\n\n');
    for (let i = 0; i < files.length; i++) {
      try {
        const anchor = files[i].replace(`${srcDirPath}/`, '').replace('/README.md', '').replace('/', '-');
        const xmlComponent = fs.readFileSync(files[i].replace('README.md', '.content.xml'), 'utf8');
        const jsonData = JSON.parse(convert.xml2json(xmlComponent, { compact: true, spaces: 2 }));
        const componentName = jsonData['jcr:root']._attributes['jcr:title'];
        fs.appendFileSync(dscFilePath, `${i + 1}. [${componentName}](#${anchor})\n`);
      } catch (err) {
        return '';
      }
    }
    fs.appendFileSync(dscFilePath, mdBreakpage);
  });
}

init();
