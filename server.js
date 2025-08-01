// NOVO: Carrega as variáveis de ambiente do arquivo .env no início de tudo
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const querystring = require('querystring');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// Configuração global para ignorar erros de certificado SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Função principal de scraping que busca marcas no portal do INPI.
 */
async function buscarMarcaINPI(marca, tipoBusca) {
    // ALTERADO: Lê as credenciais de forma segura do ambiente (process.env)
    const login = process.env.INPI_LOGIN;
    const senha = process.env.INPI_SENHA;

    // Adiciona uma verificação para garantir que as variáveis foram carregadas
    if (!login || !senha) {
        throw new Error("Credenciais INPI_LOGIN e INPI_SENHA não foram encontradas. Verifique seu arquivo .env.");
    }

    console.log(`[INPI] Iniciando busca para: "${marca}" (Tipo: ${tipoBusca})`);
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        jar,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' },
    }));

    const baseUrl = "https://busca.inpi.gov.br";

    try {
        console.log(`[INPI] Etapa 1: Realizando login com o usuário '${login}'...`);
        const loginPayload = new URLSearchParams({ T_Login: login, T_Senha: senha, action: 'login' }).toString();
        const loginResponse = await client.post(`${baseUrl}/pePI/servlet/LoginController`, loginPayload);
        if (loginResponse.data.includes("T_Login")) {
            throw new Error("Falha no login. Verifique as credenciais no seu arquivo .env.");
        }
        console.log("[INPI] Etapa 1: Login bem-sucedido.");

        console.log("[INPI] Etapa 2: Acessando página de busca...");
        await client.get(`${baseUrl}/pePI/jsp/marcas/Pesquisa_classe_basica.jsp`);
        console.log("[INPI] Etapa 2: Página de busca acessada.");

        console.log("[INPI] Etapa 3: Enviando formulário de busca...");
        let buscaPayload;
        if (tipoBusca === "Exata") {
            buscaPayload = { buscaExata: "sim", txt: "", marca, registerPerPage: "100", Action: "searchMarca", tipoPesquisa: "BY_MARCA_CLASSIF_BASICA" };
        } else {
            buscaPayload = { buscaExata: "nao", txt: "Pesquisa Radical", marca, registerPerPage: "100", Action: "searchMarca", tipoPesquisa: "BY_MARCA_CLASSIF_BASICA" };
        }
        const response = await client.post(`${baseUrl}/pePI/servlet/MarcasServletController`, new URLSearchParams(buscaPayload).toString());
        console.log("[INPI] Etapa 3: Resposta da busca recebida.");

        console.log("[INPI] Etapa 4: Processando HTML da resposta...");
        const $ = cheerio.load(response.data);
        const resultados = [];
        let tabelaResultados = null;
        let maxLinhas = 0;

        $('table').each((i, table) => {
            const numLinhas = $(table).find('tr').length;
            if (numLinhas > maxLinhas && numLinhas > 2) {
                maxLinhas = numLinhas;
                tabelaResultados = $(table);
            }
        });

        if (tabelaResultados) {
            console.log(`[INPI] Tabela de resultados encontrada (com ${maxLinhas} linhas).`);
            const cabecalho = [];
            tabelaResultados.find('tr').first().find('td[bgcolor="#B5D6AD"]').each((i, el) => { cabecalho.push($(el).text().trim()); });

            if (cabecalho.length > 8) {
                tabelaResultados.find('tr').slice(1).each((i, row) => {
                    const linhaDados = {};
                    const colunas = $(row).find('td');
                    if (colunas.length >= 9) {
                        linhaDados['Número'] = $(colunas[1]).text().trim();
                        linhaDados['Prioridade'] = $(colunas[2]).text().trim();
                        linhaDados['Marca'] = $(colunas[4]).text().trim();
                        linhaDados['Situação'] = $(colunas[6]).text().trim();
                        linhaDados['Titular'] = $(colunas[7]).text().trim();
                        linhaDados['Classe'] = $(colunas[8]).text().trim();
                        resultados.push(linhaDados);
                    }
                });
                console.log(`[INPI] ${resultados.length} resultados extraídos.`);
            }
        } else {
            console.log("[INPI] Nenhuma tabela de dados foi encontrada.");
        }

        if (resultados.length === 0 && response.data.includes("Nenhum resultado foi encontrado")) {
            console.log("[INPI] Mensagem 'Nenhum resultado foi encontrado' detectada.");
            return [];
        }
        return resultados;
    } catch (error) {
        console.error("[INPI] Erro fatal durante o scraping:", error.message);
        throw error;
    }
}

function verificarStatus(resultados) {
    if (!resultados || resultados.length === 0) return { registrada: false, status: 'Nenhum processo encontrado.', titular: null, marca_encontrada: '-' };
    const statusAtivos = ["registro de marca em vigor", "alto renome"];
    for (const res of resultados) {
        const situacao = res.Situação?.toLowerCase() || '';
        for (const status of statusAtivos) {
            if (situacao.includes(status)) return { registrada: true, status: res.Situação, titular: res.Titular, marca_encontrada: res.Marca };
        }
    }
    return { registrada: false, status: 'Nenhum registro ativo encontrado.', titular: null, marca_encontrada: '-' };
}

app.post('/api/verificar-lote', async (req, res) => {
    const { marcas } = req.body;
    if (!marcas || !Array.isArray(marcas)) return res.status(400).json({ error: 'Dados inválidos.' });

    const resultadosFinais = [];
    for (const marca of marcas) {
        try {
            const resultadosBusca = await buscarMarcaINPI(marca.toUpperCase(), "Radical");
            const verificacao = verificarStatus(resultadosBusca);
            verificacao.marca_pesquisada = marca;
            resultadosFinais.push(verificacao);
        } catch (error) {
            resultadosFinais.push({ marca_pesquisada: marca, registrada: 'erro', status: error.message });
        }
    }
    res.json(resultadosFinais);
});

app.post('/api/buscar-completa', async (req, res) => {
    const { marca, tipoBusca } = req.body;
    if (!marca || !tipoBusca) return res.status(400).json({ error: 'Dados inválidos.' });

    try {
        const resultadosBusca = await buscarMarcaINPI(marca.toUpperCase(), tipoBusca);
        res.json(resultadosBusca);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
