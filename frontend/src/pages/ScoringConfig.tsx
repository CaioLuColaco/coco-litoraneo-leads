import React, { useState, useEffect } from 'react';
import { ScoringConfig as ScoringConfigType, CreateScoringCategoryRequest } from '../types';
import { scoringAPI } from '../services/api';
import './ScoringConfig.css';

export const ScoringConfig: React.FC = () => {
  const [configs, setConfigs] = useState<ScoringConfigType[]>([]);
  const [activeConfig, setActiveConfig] = useState<ScoringConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScoringConfigType | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [] as CreateScoringCategoryRequest[]
  });

  // Buscar configurações
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const [configs, activeConfig] = await Promise.all([
        scoringAPI.getAllConfigs(),
        scoringAPI.getActiveConfig()
      ]);

      setConfigs(configs);
      setActiveConfig(activeConfig);
    } catch (err) {
      setError('Erro ao carregar configurações');
      console.error('Erro ao buscar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async () => {
    try {
      const newConfig = await scoringAPI.createConfig(formData);
      setConfigs(prev => [newConfig, ...prev]);
      setActiveConfig(newConfig);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', categories: [] });
    } catch (err) {
      setError('Erro ao criar configuração');
      console.error('Erro ao criar configuração:', err);
    }
  };

  const handleEditConfig = (config: ScoringConfigType) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      categories: config.categories.map(cat => ({
        name: cat.name,
        type: cat.type,
        points: cat.points,
        description: cat.description || '',
        criteria: cat.criteria.map(crit => ({
          name: crit.name,
          value: crit.value,
          points: crit.points,
          description: crit.description || ''
        }))
      }))
    });
    setShowEditForm(true);
  };

  const handleUpdateConfig = async () => {
    if (!editingConfig) return;
    
    try {
      const updatedConfig = await scoringAPI.updateConfig(editingConfig.id, formData);
      setConfigs(prev => prev.map(config => 
        config.id === editingConfig.id ? updatedConfig : config
      ));
      if (activeConfig?.id === editingConfig.id) {
        setActiveConfig(updatedConfig);
      }
      setShowEditForm(false);
      setEditingConfig(null);
      setFormData({ name: '', description: '', categories: [] });
    } catch (err) {
      setError('Erro ao atualizar configuração');
      console.error('Erro ao atualizar configuração:', err);
    }
  };

  const handleActivateConfig = async (id: string) => {
    try {
      const activatedConfig = await scoringAPI.activateConfig(id);
      setActiveConfig(activatedConfig);
      setConfigs(prev => prev.map(config => ({
        ...config,
        isActive: config.id === id
      })));
    } catch (err) {
      setError('Erro ao ativar configuração');
      console.error('Erro ao ativar configuração:', err);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta configuração?')) {
      return;
    }

    try {
      await scoringAPI.deleteConfig(id);
      setConfigs(prev => prev.filter(config => config.id !== id));
      if (activeConfig?.id === id) {
        setActiveConfig(null);
      }
    } catch (err) {
      setError('Erro ao excluir configuração');
      console.error('Erro ao excluir configuração:', err);
    }
  };

  const handleRecalculateScores = async () => {
    if (!window.confirm('Tem certeza que deseja recalcular as pontuações de todos os leads? Esta operação pode demorar alguns minutos.')) {
      return;
    }

    setIsRecalculating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/scoring/recalculate-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        // Recarregar a lista de configurações
        fetchConfigs();
      } else {
        alert(`❌ Erro: ${result.message || 'Erro ao recalcular pontuações'}`);
      }
    } catch (error) {
      console.error('Erro ao recalcular pontuações:', error);
      alert('❌ Erro ao recalcular pontuações. Verifique a conexão.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, {
        name: '',
        type: 'cnae' as const,
        points: 0,
        description: '',
        criteria: []
      }]
    }));
  };

  const updateCategory = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === index ? { ...cat, [field]: value } : cat
      )
    }));
  };

  const addCriteria = (categoryIndex: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === categoryIndex ? {
          ...cat,
          criteria: [...cat.criteria, {
            name: '',
            value: '',
            points: 0,
            description: ''
          }]
        } : cat
      )
    }));
  };

  const updateCriteria = (categoryIndex: number, criteriaIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === categoryIndex ? {
          ...cat,
          criteria: cat.criteria.map((crit, j) => 
            j === criteriaIndex ? { ...crit, [field]: value } : crit
          )
        } : cat
      )
    }));
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const removeCriteria = (categoryIndex: number, criteriaIndex: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => 
        i === categoryIndex ? {
          ...cat,
          criteria: cat.criteria.filter((_, j) => j !== criteriaIndex)
        } : cat
      )
    }));
  };

  if (loading) {
    return (
      <div className="scoring-config-loading">
        <div className="scoring-config-loading-text">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="scoring-config-container">
      {/* Header */}
      <div className="scoring-config-header">
        <div className="scoring-config-header-content">
          <div>
            <h1 className="scoring-config-title">Configuração de Pontuação</h1>
            <p className="scoring-config-subtitle">
              Gerencie as regras de pontuação dos leads
            </p>
          </div>
          
          <div className="scoring-config-header-actions">
            <button
              onClick={handleRecalculateScores}
              disabled={isRecalculating}
              className="scoring-config-recalculate-btn"
            >
              {isRecalculating ? '🔄 Recalculando...' : '🔄 Recalcular Pontuações'}
            </button>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="scoring-config-create-btn"
            >
              Nova Configuração
            </button>
          </div>
        </div>
      </div>

      {/* Configuração Ativa */}
      {activeConfig && (
        <div className="scoring-config-active">
          <h2 className="scoring-config-active-title">
            Configuração Ativa: {activeConfig.name}
          </h2>
          <p className="scoring-config-active-description">
            {activeConfig.description || 'Sem descrição'}
          </p>
          
          <div className="scoring-config-categories">
            {activeConfig.categories.map((category) => (
              <div key={category.id} className="scoring-config-category">
                <h3 className="scoring-config-category-title">
                  {category.name} ({category.points} pontos)
                </h3>
                <p className="scoring-config-category-description">
                  {category.description || 'Sem descrição'}
                </p>
                
                <div className="scoring-config-criteria">
                  {category.criteria.map((criteria) => (
                    <div key={criteria.id} className="scoring-config-criterion">
                      <span className="scoring-config-criterion-name">
                        {criteria.name}
                      </span>
                      <span className="scoring-config-criterion-points">
                        {criteria.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Configurações */}
      <div className="scoring-config-list">
        <h2 className="scoring-config-list-title">Todas as Configurações</h2>
        
        {configs.map((config) => (
          <div key={config.id} className="scoring-config-item">
            <div className="scoring-config-item-header">
              <div className="scoring-config-item-info">
                <h3 className="scoring-config-item-name">
                  {config.name}
                  {config.isActive && (
                    <span className="scoring-config-active-badge">Ativa</span>
                  )}
                </h3>
                <p className="scoring-config-item-description">
                  {config.description || 'Sem descrição'}
                </p>
                <p className="scoring-config-item-date">
                  Criada em: {new Date(config.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div className="scoring-config-item-actions">
                <button
                  onClick={() => handleEditConfig(config)}
                  className="scoring-config-edit-btn"
                >
                  Editar
                </button>
                {!config.isActive && (
                  <button
                    onClick={() => handleActivateConfig(config.id)}
                    className="scoring-config-activate-btn"
                  >
                    Ativar
                  </button>
                )}
                <button
                  onClick={() => handleDeleteConfig(config.id)}
                  className="scoring-config-delete-btn"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação */}
      {showCreateForm && (
        <div className="scoring-config-modal">
          <div className="scoring-config-modal-content">
            <div className="scoring-config-modal-header">
              <h2>Nova Configuração de Pontuação</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="scoring-config-modal-close"
              >
                ×
              </button>
            </div>

            <div className="scoring-config-form">
              <div className="scoring-config-form-group">
                <label>Nome da Configuração</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Configuração Padrão"
                  className="scoring-config-input"
                />
              </div>

              <div className="scoring-config-form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da configuração"
                  className="scoring-config-textarea"
                />
              </div>

              <div className="scoring-config-categories-section">
                <h3>Categorias de Pontuação</h3>
                
                {formData.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="scoring-config-category-form">
                    <div className="scoring-config-category-header">
                      <h4>Categoria {categoryIndex + 1}</h4>
                      <button
                        onClick={() => removeCategory(categoryIndex)}
                        className="scoring-config-remove-btn"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="scoring-config-form-row">
                      <div className="scoring-config-form-group">
                        <label>Nome da Categoria</label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                          placeholder="Ex: CNAEs de Alto Potencial"
                          className="scoring-config-input"
                        />
                      </div>

                      <div className="scoring-config-form-group">
                        <label>Tipo</label>
                        <select
                          value={category.type}
                          onChange={(e) => updateCategory(categoryIndex, 'type', e.target.value)}
                          className="scoring-config-select"
                        >
                          <option value="cnae">CNAE</option>
                          <option value="region">Região</option>
                          <option value="capital">Capital Social</option>
                          <option value="foundation">Data de Fundação</option>
                          <option value="address">Endereço</option>
                          <option value="partners">Sócios</option>
                          <option value="custom">Customizado</option>
                        </select>
                      </div>

                      <div className="scoring-config-form-group">
                        <label>Pontos Base</label>
                        <input
                          type="number"
                          value={category.points}
                          onChange={(e) => updateCategory(categoryIndex, 'points', parseInt(e.target.value))}
                          className="scoring-config-input"
                        />
                      </div>
                    </div>

                    <div className="scoring-config-form-group">
                      <label>Descrição da Categoria</label>
                      <input
                        type="text"
                        value={category.description}
                        onChange={(e) => updateCategory(categoryIndex, 'description', e.target.value)}
                        placeholder="Descrição da categoria"
                        className="scoring-config-input"
                      />
                    </div>

                    <div className="scoring-config-criteria-section">
                      <h5>Critérios</h5>
                      
                      {category.criteria.map((criteria, criteriaIndex) => (
                        <div key={criteriaIndex} className="scoring-config-criteria-form">
                          <div className="scoring-config-form-row">
                            <div className="scoring-config-form-group">
                              <label>Nome do Critério</label>
                              <input
                                type="text"
                                value={criteria.name}
                                onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'name', e.target.value)}
                                placeholder="Ex: 4721100 - Padaria"
                                className="scoring-config-input"
                              />
                            </div>

                            <div className="scoring-config-form-group">
                              <label>Valor</label>
                              <input
                                type="text"
                                value={criteria.value}
                                onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'value', e.target.value)}
                                placeholder="Ex: 4721100"
                                className="scoring-config-input"
                              />
                            </div>

                            <div className="scoring-config-form-group">
                              <label>Pontos</label>
                              <input
                                type="number"
                                value={criteria.points}
                                onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'points', parseInt(e.target.value))}
                                className="scoring-config-input"
                              />
                            </div>
                          </div>
                          
                          <div className="scoring-config-form-group">
                            <label>Descrição do Critério</label>
                            <input
                              type="text"
                              value={criteria.description}
                              onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'description', e.target.value)}
                              placeholder="Descrição do critério"
                              className="scoring-config-input"
                            />
                          </div>
                          
                          <button
                            onClick={() => removeCriteria(categoryIndex, criteriaIndex)}
                            className="scoring-config-remove-btn"
                          >
                            Remover
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => addCriteria(categoryIndex)}
                        className="scoring-config-add-btn"
                      >
                        Adicionar Critério
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addCategory}
                  className="scoring-config-add-btn"
                >
                  Adicionar Categoria
                </button>
              </div>

              <div className="scoring-config-modal-actions">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="scoring-config-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateConfig}
                  className="scoring-config-save-btn"
                  disabled={!formData.name || formData.categories.length === 0}
                >
                  Criar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditForm && editingConfig && (
        <div className="scoring-config-modal">
          <div className="scoring-config-modal-content">
            <div className="scoring-config-modal-header">
              <h2>Editar Configuração: {editingConfig.name}</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingConfig(null);
                  setFormData({ name: '', description: '', categories: [] });
                }}
                className="scoring-config-modal-close"
              >
                ×
              </button>
            </div>

            <div className="scoring-config-form">
              <div className="scoring-config-form-group">
                <label>Nome da Configuração</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Configuração Padrão"
                  className="scoring-config-input"
                />
              </div>

              <div className="scoring-config-form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da configuração"
                  className="scoring-config-textarea"
                />
              </div>

              <div className="scoring-config-categories-section">
                <h3>Categorias de Pontuação</h3>
                
                {formData.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="scoring-config-category-form">
                    <div className="scoring-config-category-header">
                      <h4>Categoria {categoryIndex + 1}</h4>
                      <button
                        onClick={() => removeCategory(categoryIndex)}
                        className="scoring-config-remove-btn"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="scoring-config-form-row">
                      <div className="scoring-config-form-group">
                        <label>Nome da Categoria</label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                          placeholder="Ex: CNAEs de Alto Potencial"
                          className="scoring-config-input"
                        />
                      </div>

                      <div className="scoring-config-form-group">
                        <label>Tipo</label>
                        <select
                          value={category.type}
                          onChange={(e) => updateCategory(categoryIndex, 'type', e.target.value)}
                          className="scoring-config-select"
                        >
                          <option value="cnae">CNAE</option>
                          <option value="region">Região</option>
                          <option value="capital">Capital Social</option>
                          <option value="foundation">Data de Fundação</option>
                          <option value="address">Endereço</option>
                          <option value="partners">Sócios</option>
                          <option value="custom">Customizado</option>
                        </select>
                      </div>

                      <div className="scoring-config-form-group">
                        <label>Pontos Base</label>
                        <input
                          type="number"
                          value={category.points}
                          onChange={(e) => updateCategory(categoryIndex, 'points', parseInt(e.target.value))}
                          className="scoring-config-input"
                        />
                      </div>
                    </div>

                    <div className="scoring-config-form-group">
                      <label>Descrição da Categoria</label>
                      <input
                        type="text"
                        value={category.description}
                        onChange={(e) => updateCategory(categoryIndex, 'description', e.target.value)}
                        placeholder="Descrição da categoria"
                        className="scoring-config-input"
                      />
                    </div>

                    <div className="scoring-config-criteria-section">
                      <h5>Critérios</h5>
                      
                      {category.criteria.map((criteria, criteriaIndex) => (
                        <div key={criteriaIndex} className="scoring-config-criteria-form">
                          <div className="scoring-config-form-row">
                            <div className="scoring-config-form-group">
                              <label>Nome do Critério</label>
                              <input
                                type="text"
                                value={criteria.name}
                                onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'name', e.target.value)}
                                placeholder="Ex: 4721100 - Padaria"
                                className="scoring-config-input"
                              />
                            </div>

                            <div className="scoring-config-form-group">
                              <label>Valor</label>
                              <input
                                type="text"
                                value={criteria.value}
                                onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'value', e.target.value)}
                                placeholder="Ex: 4721100"
                                className="scoring-config-input"
                              />
                            </div>

                            <div className="scoring-config-form-group">
                              <label>Pontos</label>
                              <input
                                type="number"
                                value={criteria.points}
                                onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'points', parseInt(e.target.value))}
                                className="scoring-config-input"
                              />
                            </div>
                          </div>
                          
                          <div className="scoring-config-form-group">
                            <label>Descrição do Critério</label>
                            <input
                              type="text"
                              value={criteria.description}
                              onChange={(e) => updateCriteria(categoryIndex, criteriaIndex, 'description', e.target.value)}
                              placeholder="Descrição do critério"
                              className="scoring-config-input"
                            />
                          </div>
                          
                          <button
                            onClick={() => removeCriteria(categoryIndex, criteriaIndex)}
                            className="scoring-config-remove-btn"
                          >
                            Remover
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => addCriteria(categoryIndex)}
                        className="scoring-config-add-btn"
                      >
                        Adicionar Critério
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addCategory}
                  className="scoring-config-add-btn"
                >
                  Adicionar Categoria
                </button>
              </div>

              <div className="scoring-config-modal-actions">
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingConfig(null);
                    setFormData({ name: '', description: '', categories: [] });
                  }}
                  className="scoring-config-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateConfig}
                  className="scoring-config-save-btn"
                  disabled={!formData.name || formData.categories.length === 0}
                >
                  Atualizar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="scoring-config-error">
          <div className="scoring-config-error-text">{error}</div>
        </div>
      )}
    </div>
  );
};
