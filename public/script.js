document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores para os elementos da UI ---
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const resultsContainer = document.getElementById('results-container');
    const resultsTable = document.getElementById('results-table');
    const resultsTitle = document.getElementById('results-title');

    // --- Lógica do Formulário 1: Verificação em Lote ---
    const formVerificacao = document.getElementById('form-verificacao-lote');
    formVerificacao.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        // Coleta os dados do formulário de verificação
        const login = document.getElementById('login-lote').value;
        const senha = document.getElementById('senha-lote').value;
        const marcasInput = document.getElementById('marcas-lote').value;
        const marcas = marcasInput.split('\n').map(m => m.trim()).filter(m => m); // Transforma o texto em uma lista de marcas

        if (marcas.length === 0) {
            alert('Por favor, insira pelo menos uma marca na lista.');
            return;
        }

        showLoading('Iniciando verificação em lote...');
        try {
            // Envia os dados para a API do nosso backend
            const response = await fetch('/api/verificar-lote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha, marcas })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            const resultados = await response.json();

            // Define os cabeçalhos para a tabela de resultados da verificação
            const headers = ['Marca Pesquisada', 'Possui Registro Ativo?', 'Status Encontrado', 'Titular do Registro', 'Marca Conflitante Encontrada'];

            // Mapeia os dados recebidos para corresponder aos cabeçalhos
            const data = resultados.map(res => ({
                'Marca Pesquisada': res.marca_pesquisada,
                'Possui Registro Ativo?': res.registrada === 'erro' ? 'Erro' : (res.registrada ? 'Sim' : 'Não'),
                                                'Status Encontrado': res.status,
                                                'Titular do Registro': res.titular,
                                                'Marca Conflitante Encontrada': res.marca_encontrada
            }));

            displayResults("Resultado da Análise em Lote", headers, data);

        } catch (error) {
            showError(error.message);
        }
    });

    // --- Lógica do Formulário 2: Busca Completa Individual ---
    const formBusca = document.getElementById('form-busca-completa');
    formBusca.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Coleta os dados do formulário de busca
        const login = document.getElementById('login-busca').value;
        const senha = document.getElementById('senha-busca').value;
        const marca = document.getElementById('marca-busca').value;
        const tipoBusca = document.querySelector('input[name="tipoBusca"]:checked').value;

        showLoading(`Buscando por "${marca}"...`);
        try {
            // Envia os dados para a API do nosso backend
            const response = await fetch('/api/buscar-completa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha, marca, tipoBusca })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro no servidor');
            }

            const resultados = await response.json();

            if(resultados.length === 0) {
                showInfo(`Nenhum processo encontrado para a marca '${marca}'.`);
            } else {
                // Pega os nomes das colunas dinamicamente a partir do primeiro resultado
                const headers = Object.keys(resultados[0]);
                displayResults(`Resultados para "${marca}"`, headers, resultados);
            }
        } catch (error) {
            showError(error.message);
        }
    });

    // --- Funções Auxiliares para manipular a UI ---

    function showLoading(message) {
        resultsContainer.classList.add('hidden');
        statusContainer.classList.remove('hidden');
        statusText.textContent = message;
    }

    function showError(message) {
        statusContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        statusText.textContent = `Erro: ${message}`;
    }

    function showInfo(message) {
        statusContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        statusText.textContent = message;
    }

    function displayResults(title, headers, data) {
        statusContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        resultsTitle.textContent = title;

        const thead = resultsTable.querySelector('thead');
        const tbody = resultsTable.querySelector('tbody');
        thead.innerHTML = ''; // Limpa cabeçalho antigo
        tbody.innerHTML = ''; // Limpa corpo antigo

        // Cria a linha de cabeçalho da tabela
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.className = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Preenche as linhas da tabela com os dados recebidos
        data.forEach(item => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-700";
                td.textContent = item[header] || '-';
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
    }
});
