import React, { useState } from 'react';

interface SalesforceWebhookProps {
  baseUrl: string;
}

const SalesforceWebhook: React.FC<SalesforceWebhookProps> = ({ baseUrl }) => {
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${baseUrl}/api/leads/salesforce-webhook`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar para clipboard:', err);
    }
  };

  return (
    <div className="salesforce-webhook">
      <div className="webhook-header">
        <h3>🔗 Integração com Salesforce</h3>
        <p>Use esta URL para importar leads automaticamente no Salesforce</p>
      </div>
      
      <div className="webhook-url-container">
        <div className="url-display">
          <span className="url-label">URL do Webhook:</span>
          <code className="url-value">{webhookUrl}</code>
        </div>
        
        <button 
          onClick={copyToClipboard}
          className={`copy-button ${copied ? 'copied' : ''}`}
          title="Copiar URL para clipboard"
        >
          {copied ? '✅ Copiado!' : '📋 Copiar'}
        </button>
      </div>

      <div className="webhook-info">
        <div className="info-card">
          <h4>📊 Dados Disponíveis</h4>
          <ul>
            <li><strong>Company:</strong> Nome da empresa</li>
            <li><strong>CNPJ__c:</strong> CNPJ da empresa</li>
            <li><strong>City/State:</strong> Cidade e estado</li>
            <li><strong>Lead_Score__c:</strong> Pontuação de potencial (0-100)</li>
            <li><strong>Industry:</strong> Setor de atividade</li>
            <li><strong>Annual_Revenue__c:</strong> Capital social</li>
            <li><strong>Address_Validated__c:</strong> Endereço validado</li>
          </ul>
        </div>

        <div className="info-card">
          <h4>⚙️ Como Configurar</h4>
          <ol>
            <li>Copie a URL acima</li>
            <li>No Salesforce: Setup → Data Import Wizard</li>
            <li>Escolha "External Data Source"</li>
            <li>Cole a URL e configure o mapeamento</li>
            <li>Agende importações automáticas</li>
          </ol>
        </div>
      </div>

      <div className="webhook-note">
        <p><strong>💡 Dica:</strong> Esta URL retorna apenas leads com status "processado" e é atualizada em tempo real.</p>
      </div>
    </div>
  );
};

export default SalesforceWebhook;
