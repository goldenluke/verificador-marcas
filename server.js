require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const querystring = require('querystring');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Função principal de scraping.
 * AGORA RETORNA UM OBJETO: { data: [resultados], total: numero_de_processos }
 */
async function buscarMarcaINPI(marca, tipoBusca) {
    const login = process.env.INPI_LOGIN;
    const senha = process.env.INPI_SENHA;
    if (!login || !senha) throw new Error("Credenciais não encontradas no .env.");

    console.log(`[INPI] Iniciando busca para: "${marca}"`);
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, headers: { 'User-Agent': 'Mozilla/5.0' } }));
    const baseUrl = "https://busca.inpi.gov.br";

    try {
        await client.post(`${baseUrl}/pePI/servlet/LoginController`, new URLSearchParams({ T_Login: login, T_Senha: senha, action: 'login' }).toString());
        await client.get(`${baseUrl}/pePI/jsp/marcas/Pesquisa_classe_basica.jsp`);

        let buscaPayload;
        if (tipoBusca === "Exata") {
            buscaPayload = { buscaExata: "sim", txt: "", marca, registerPerPage: "100", Action: "searchMarca", tipoPesquisa: "BY_MARCA_CLASSIF_BASICA" };
        } else {
            buscaPayload = { buscaExata: "nao", txt: "Pesquisa Radical", marca, registerPerPage: "100", Action: "searchMarca", tipoPesquisa: "BY_MARCA_CLASSIF_BASICA" };
        }
        const response = await client.post(`${baseUrl}/pePI/servlet/MarcasServletController`, new URLSearchParams(buscaPayload).toString());

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

        // --- NOVA LÓGICA PARA EXTRAIR O TOTAL DE CORRESPONDÊNCIAS ---
        let totalProcessos = 0;
        const fontElement = $('font.normal').filter(function() {
            return $(this).text().includes('Foram encontrados');
        }).first();

        if (fontElement.length) {
            const htmlContent = fontElement.html();
            const match = htmlContent.match(/<b>(\d+)<\/b>/);
            if (match && match[1]) {
                totalProcessos = parseInt(match[1], 10);
            }
        }
        // --- FIM DA NOVA LÓGICA ---

        if (tabelaResultados) {
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
            }
        }

        // A função agora retorna um objeto com os dados e o total
        return { data: resultados, total: totalProcessos };

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
            // --- ALTERADO PARA RECEBER O OBJETO COMPLETO ---
            const { data: resultadosBusca, total: totalCorrespondencias } = await buscarMarcaINPI(marca.toUpperCase(), "Radical");
            const verificacao = verificarStatus(resultadosBusca);
            verificacao.marca_pesquisada = marca;
            verificacao.correspondencias = totalCorrespondencias; // Adiciona o novo campo
            resultadosFinais.push(verificacao);
        } catch (error) {
            resultadosFinais.push({ marca_pesquisada: marca, registrada: 'erro', status: "Falha na comunicação com o INPI.", correspondencias: 0 });
        }
    }
    res.json(resultadosFinais);
});

app.post('/api/buscar-completa', async (req, res) => {
    const { marca, tipoBusca } = req.body;
    if (!marca || !tipoBusca) return res.status(400).json({ error: 'Dados inválidos.' });

    try {
        // A busca completa retorna apenas os dados da tabela
        const { data: resultadosBusca } = await buscarMarcaINPI(marca.toUpperCase(), tipoBusca);
        res.json(resultadosBusca);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
