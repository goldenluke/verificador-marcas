# 🔎 Verificador de Marcas INPI

Uma aplicação web para automatizar a consulta de marcas no portal do Instituto Nacional da Propriedade Industrial (INPI) do Brasil. A ferramenta oferece uma interface limpa e moderna para realizar buscas em lote ou individuais, otimizando o processo de verificação de disponibilidade e registro de marcas.

## ✨ Funcionalidades

  * **Interface Web Moderna:** Construída com HTML e estilizada com [Tailwind CSS](https://tailwindcss.com/) para uma experiência de usuário limpa e responsiva.
  * **Verificação em Lote:** Permite inserir uma lista de marcas (uma por linha) e verificar rapidamente se alguma delas já possui um registro ativo, incluindo o número total de correspondências para cada termo.
  * **Busca Completa Individual:** Realiza uma busca detalhada por uma única marca (nos modos "Radical" ou "Exata") e exibe todos os processos encontrados em uma tabela.
  * **Scraping Robusto:** A lógica de backend em Node.js é projetada para ser resiliente a pequenas mudanças no layout do site do INPI.
  * **Gerenciamento Seguro de Credenciais:** As credenciais de login não ficam expostas no código, sendo gerenciadas de forma segura através de variáveis de ambiente.

  * Demonstração: https://verificador-inpi.onrender.com/
    
## 🚀 Tecnologias Utilizadas

Este projeto é dividido em um backend e um frontend:

  * **Backend:**

      * [Node.js](https://nodejs.org/) como ambiente de execução.
      * [Express.js](https://expressjs.com/pt-br/) para criar o servidor e as rotas da API.
      * [Axios](https://axios-http.com/) (com `axios-cookiejar-support`) para fazer as requisições HTTP e gerenciar a sessão de login.
      * [Cheerio](https://cheerio.js.org/) para fazer o parsing e a extração de dados do HTML (web scraping).
      * [Dotenv](https://www.npmjs.com/package/dotenv) para gerenciar as variáveis de ambiente.

  * **Frontend:**

      * HTML5.
      * [Tailwind CSS](https://tailwindcss.com/) (via CDN) para estilização.
      * JavaScript (puro) para interatividade e comunicação com o backend.

## 🛠️ Instalação e Configuração

Siga os passos abaixo para rodar a aplicação localmente.

### Pré-requisitos

  * [Node.js](https://nodejs.org/) (versão 16 ou superior)
  * [npm](https://www.npmjs.com/) (geralmente instalado junto com o Node.js)

### Passos

1.  **Clone o repositório:**

    ```bash
    git clone <url-do-seu-repositorio>
    cd inpi-nodejs
    ```

2.  **Instale as dependências do projeto:**

    ```bash
    npm install
    ```

3.  **Configure suas credenciais:**
    Crie um arquivo chamado `.env` na raiz do projeto. Este arquivo guardará suas credenciais de forma segura e não será enviado para o GitHub.

    ```bash
    # Crie o arquivo
    touch .env
    ```

    Abra o arquivo `.env` e adicione seu login e senha do INPI, como no exemplo abaixo:

    ```env
    INPI_LOGIN="seu_login_aqui"
    INPI_SENHA="sua_senha_aqui"
    ```

4.  **Garanta que o arquivo `.env` seja ignorado pelo Git.**
    Verifique se o seu arquivo `.gitignore` contém a linha:

    ```
    .env
    ```

## 🏃 Como Usar

1.  **Inicie o servidor backend:**

    ```bash
    node server.js
    ```

    Você verá a mensagem `Servidor rodando em http://localhost:3000` no seu terminal.

2.  **Acesse a aplicação:**
    Abra seu navegador de internet e navegue para o endereço:
    [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)

Agora você pode usar as funcionalidades de verificação em lote e busca completa diretamente no seu navegador.

## 🚀 Deploy Online

A aplicação está pronta para ser publicada em plataformas de hospedagem para aplicações Node.js.

  * **Plataforma Recomendada:** [Render](https://render.com/).
  * **Instruções:** Siga o guia de deploy para um "Web Service", conectando seu repositório do GitHub.
  * **Importante:** Lembre-se de configurar as `Environment Variables` (`INPI_LOGIN` e `INPI_SENHA`) diretamente no painel da plataforma de hospedagem, pois o arquivo `.env` não é enviado para o servidor.

## ⚖️ Aviso Legal

Esta ferramenta é um projeto de automação para fins de aprendizado e otimização de tarefas. Ela realiza uma verificação preliminar e não substitui uma análise jurídica completa de viabilidade de registro de marca. Os dados são extraídos diretamente do portal do INPI e estão sujeitos à disponibilidade e às regras do mesmo.

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
