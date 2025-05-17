# 🖥️ Servidor OCR de Placas Veiculares (Radar Motu)

Este projeto consiste em um servidor backend desenvolvido em Node.js com Express.js, responsável por receber imagens de placas veiculares, processá-las utilizando a API Google Cloud Vision para realizar o Reconhecimento Óptico de Caracteres (OCR), e então extrair e formatar o número da placa no padrão Mercosul.

Este servidor é um componente crucial do sistema "Radar Motu", fornecendo a funcionalidade de identificação automática de placas para o aplicativo mobile.

---

## 📍 Funcionalidades Principais

* **Upload de Imagens:** Expõe um endpoint HTTP (`POST /upload`) que aceita o upload de um arquivo de imagem (`multipart/form-data`).
* **OCR com Google Cloud Vision:** Utiliza a biblioteca `@google-cloud/vision` para enviar a imagem para a API do Google Cloud e detectar todo o texto presente.
* **Extração Inteligente de Placas:** Implementa uma função customizada (`extrairPlaca`) que analisa o texto completo retornado pelo OCR e busca por padrões de placas veiculares no formato Mercosul (LLLNLNN). Inclui lógica para:
    * Ignorar espaçamentos e caracteres não alfanuméricos.
    * Aplicar correções comuns de OCR (ex: '0' por 'O', '1' por 'I', 'B' por '8', etc.) em posições específicas da placa para aumentar a precisão do reconhecimento.
    * Considerar candidatos de placa mesmo que estejam concatenados com outros textos.
* **Resposta JSON:** Retorna um objeto JSON contendo a placa identificada (ou `null` se nenhuma for encontrada) e uma mensagem de status.
* **Serviço de Arquivos Estáticos:** A pasta `uploads/` (onde as imagens são temporariamente salvas) é servida estaticamente, embora não seja o foco principal da API.
* **CORS Habilitado:** Permite requisições de diferentes origens (importante para o app mobile).

---

## 🛠️ Tecnologias Utilizadas

* **Node.js:** Ambiente de execução JavaScript no servidor.
* **Express.js:** Framework web para criar a API e gerenciar rotas.
* **Multer:** Middleware para lidar com uploads de arquivos (`multipart/form-data`).
* **`@google-cloud/vision`:** Biblioteca cliente oficial do Google para interagir com a API Google Cloud Vision.
* **`dotenv`:** Para carregar variáveis de ambiente de um arquivo `.env` (embora neste exemplo, a principal configuração do Google Cloud seja via variável de ambiente do sistema).

---

## ⚙️ Configuração e Execução do Projeto

### Pré-requisitos

1.  **Node.js e NPM (ou Yarn):** Certifique-se de ter o Node.js (versão LTS recomendada) e o NPM (ou Yarn) instalados.
2.  **Conta no Google Cloud Platform (GCP):**
    * É necessário ter uma conta no GCP e um projeto criado.
    * A **API Cloud Vision deve estar habilitada** para o seu projeto no GCP.
3.  **Autenticação do Google Cloud:**
    * Você precisará configurar a autenticação para que sua aplicação possa usar a API Cloud Vision. A forma mais comum é criar uma **Conta de Serviço (Service Account)** no GCP com as permissões adequadas para acessar a Vision API.
    * Faça o download do arquivo JSON da chave dessa Conta de Serviço.
    * Defina a variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS` no seu sistema para apontar para o caminho completo deste arquivo JSON.
        * Exemplo (Linux/macOS): `export GOOGLE_APPLICATION_CREDENTIALS="/caminho/para/sua-chave.json"`
        * Exemplo (Windows PowerShell): `$env:GOOGLE_APPLICATION_CREDENTIALS="/caminho/para/sua-chave.json"`
        * (Para desenvolvimento, você pode definir isso no seu terminal antes de iniciar o servidor, ou configurar no seu sistema).

### Passos para Rodar

1.  **Clone o Repositório (se estiver em um repositório separado):**
    ```bash
    git clone https://github.com/ArthurBispo00/servidor_OCR
    cd servidor_OCR
    ```

2.  **Instale as Dependências:**
    Na pasta raiz do projeto do servidor, execute:
    ```bash
    npm install
    ```
    Isso instalará `express`, `multer`, `cors`, `@google-cloud/vision` e `dotenv` listados no seu `package.json` (certifique-se de que eles estão lá).

3.  **Crie um arquivo `.env` (Opcional para este código, mas boa prática):**
    O código usa `require('dotenv').config();`. Embora a URL da API do Google Cloud não seja configurada aqui (ela usa as credenciais do ambiente), você pode usar o `.env` para outras configurações, como a porta:
    ```env
    # .env
    PORT=3000
    ```
    E no seu `servidor_OCR.js`, você usaria `process.env.PORT || 3000`. Por enquanto, a porta `3000` está fixa no código.

4.  **Inicie o Servidor:**
    ```bash
    node servidor_OCR.js
    ```
    Ou, se você configurar um script no `package.json` (ex: `"start": "node servidor_OCR.js"`):
    ```bash
    npm start
    ```
    Você deverá ver a mensagem: `Servidor backend rodando em http://localhost:3000` (ou a porta que você configurou).

---

## 📡 Endpoint da API

### `POST /upload`

* **Método:** `POST`
* **Content-Type:** `multipart/form-data`
* **Campo do Arquivo:** A imagem deve ser enviada no campo chamado `image`.
* **Resposta de Sucesso (200 OK):**
    ```json
    {
      "placa": "ABC1D23", // ou null se não encontrada
      "mensagem": "Placa identificada com sucesso." // ou mensagem de erro/status
    }
    ```
* **Resposta de Erro:**
    * `400 Bad Request`: Se nenhum arquivo for enviado.
        ```json
        { "error": "Nenhum arquivo enviado" }
        ```
    * `500 Internal Server Error`: Se ocorrer um erro ao processar com a Google Vision API.
        ```json
        { "error": "Erro ao processar imagem com Google Vision API" }
        ```

---

Este `README.md` deve cobrir os pontos principais para que seu professor (ou qualquer pessoa) entenda e consiga rodar seu servidor de OCR. Lembre-se de criar um arquivo `package.json` para seu servidor se ainda não tiver (`npm init -y`) e adicionar as dependências (`npm install express multer cors @google-cloud/vision dotenv`).
