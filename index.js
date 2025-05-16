require('dotenv').config(); // Carrega variáveis do .env

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

const app = express();
const port = 3000;

app.use(cors());

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      console.log('Diretório "uploads" não encontrado. Criando...');
      fs.mkdirSync(uploadDir);
    }
    // console.log('Arquivo será salvo em:', uploadDir); // Log já existe no original
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    // console.log('Nome do arquivo após o upload:', filename); // Log já existe no original
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

// Função para extrair placa no padrão Mercosul com correção de OCR aprimorada
function extrairPlaca(textoCompleto) {
  const palavras = textoCompleto.replace(/\s+/g, ' ').toUpperCase().split(' ');
  const placaRegexMercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/; // Formato LLLNLNN

  const correcaoParaLetra = { '0': 'O', '1': 'I', '8': 'B', '5': 'S', '2': 'Z' };
  const correcaoParaNumero = { 'O': '0', 'I': '1', 'B': '8', 'S': '5', 'Z': '2' };

  for (let palavraOriginal of palavras) {
    const palavraLimpa = palavraOriginal.replace(/[^A-Z0-9]/g, '');

    let candidato = null;

    if (palavraLimpa.length === 7) {
      candidato = palavraLimpa;
    } else if (palavraLimpa.length > 7) {
      // Se a palavra for maior, considera os últimos 7 caracteres.
      // Isso ajuda se a placa estiver concatenada com algo, ex: "XYZABC1D23" -> "ABC1D23"
      candidato = palavraLimpa.slice(-7);
    }

    // Prossegue para a lógica de verificação e correção apenas se tivermos um candidato de 7 caracteres
    if (candidato) {
      // console.log(`Processando candidato '${candidato}' derivado de '${palavraOriginal}'`);

      // Tentativa 1: Checar se o candidato já corresponde ao padrão Mercosul
      if (placaRegexMercosul.test(candidato)) {
        console.log(`Placa encontrada diretamente: ${candidato} (da palavra OCR: '${palavraOriginal}')`);
        return candidato;
      }

      // Tentativa 2: Aplicar correções posicionais e checar novamente
      let chars = candidato.split('');
      let corrigidaChars = [...chars]; // Cria uma cópia mutável

      // Posições 0, 1, 2: Deve ser Letra (L)
      for (let i of [0, 1, 2]) {
        if (/[0-9]/.test(corrigidaChars[i]) && correcaoParaLetra[corrigidaChars[i]]) {
          corrigidaChars[i] = correcaoParaLetra[corrigidaChars[i]];
        }
      }
      // Posição 3: Deve ser Número (N)
      if (/[A-Z]/.test(corrigidaChars[3]) && correcaoParaNumero[corrigidaChars[3]]) {
        corrigidaChars[3] = correcaoParaNumero[corrigidaChars[3]];
      }
      // Posição 4: Deve ser Letra (L)
      if (/[0-9]/.test(corrigidaChars[4]) && correcaoParaLetra[corrigidaChars[4]]) {
        corrigidaChars[4] = correcaoParaLetra[corrigidaChars[4]];
      }
      // Posições 5, 6: Deve ser Número (N)
      for (let i of [5, 6]) {
        if (/[A-Z]/.test(corrigidaChars[i]) && correcaoParaNumero[corrigidaChars[i]]) {
          corrigidaChars[i] = correcaoParaNumero[corrigidaChars[i]];
        }
      }

      const placaCorrigida = corrigidaChars.join('');
      
      if (candidato !== placaCorrigida) { // Loga apenas se houve mudança
        console.log(`Palavra OCR: '${palavraOriginal}', Candidato: '${candidato}', Tentativa corrigida: '${placaCorrigida}'`);
      }

      if (placaRegexMercosul.test(placaCorrigida)) {
        console.log(`Placa encontrada após correção: ${placaCorrigida} (da palavra OCR: '${palavraOriginal}')`);
        return placaCorrigida;
      }
    }
  }

  console.warn('Nenhuma placa válida (Mercosul LLLNLNN) encontrada após tentativas de correção.');
  return null;
}

// Endpoint para upload e OCR
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    console.error('Erro: Nenhum arquivo foi enviado');
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const imagePath = req.file.path;
  console.log('Imagem recebida:', imagePath); // Log original

  const client = new ImageAnnotatorClient();

  try {
    const [result] = await client.textDetection(imagePath);
    const textAnnotations = result.textAnnotations;

    if (!textAnnotations || textAnnotations.length === 0) {
      return res.json({
        placa: null,
        mensagem: 'Nenhum texto foi detectado na imagem.',
      });
    }

    const recognizedText = textAnnotations[0].description;
    console.log('Texto detectado pelo OCR:\n', recognizedText); // Log original modificado para ver melhor

    const placa = extrairPlaca(recognizedText);

    res.json({
      placa,
      mensagem: placa ? 'Placa identificada com sucesso.' : 'Não foi possível identificar a placa automaticamente.',
    });

  } catch (error) {
    console.error('Erro ao usar Google Vision API:', error.message, error.stack);
    res.status(500).json({ error: 'Erro ao processar imagem com Google Vision API' });
  }
});

// Servir a pasta de uploads publicamente
app.use('/uploads', express.static('uploads'));

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});