import React, { useEffect, useMemo, useState } from 'react';
import { sellersAPI } from '../services/api';
import { Seller, CreateSellerRequest } from '../types';
import './LeadsMap.css';

const Sellers: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<CreateSellerRequest>({
    name: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    responsibleRegion: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        setLoading(true);
        const data = await sellersAPI.getAll();
        setSellers(data);
      } catch (e) {
        setError('Erro ao carregar vendedores');
      } finally {
        setLoading(false);
      }
    };
    fetchSellers();
  }, []);

  const columns = useMemo(() => [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'responsibleRegion', label: 'Região Responsável' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'UF' },
  ], []);

  const openCreateModal = () => {
    setForm({
      name: '',
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      responsibleRegion: '',
    });
    setFormErrors({});
    setIsCreating(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setIsCreating(false);
  };

  const validateForm = (data: CreateSellerRequest): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) errors.name = 'Informe o nome';
    if (!data.email.trim()) errors.email = 'Informe o e-mail';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'E-mail inválido';
    if (!data.phone.trim()) errors.phone = 'Informe o telefone';
    if (!data.city.trim()) errors.city = 'Informe a cidade';
    if (!data.state.trim()) errors.state = 'Informe a UF';
    if (!data.responsibleRegion.trim()) errors.responsibleRegion = 'Informe a região';
    if (!data.birthDate.trim()) errors.birthDate = 'Informe a data de nascimento';
    return errors;
  };

  const handleInputChange = (field: keyof CreateSellerRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSaving(true);
      const created = await sellersAPI.create(form);
      setSellers((prev) => [created, ...prev]);
      setIsCreating(false);
    } catch (err) {
      setFormErrors({ _root: 'Falha ao criar vendedor. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="leads-map-loading">
        <div className="leads-map-loading-text">Carregando vendedores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leads-map-error">
        <div className="leads-map-error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="leads-map-container">
      <div className="leads-map-header">
        <div className="leads-map-header-content">
          <div>
            <h1 className="leads-map-title">Vendedores</h1>
            <p className="leads-map-subtitle">{sellers.length} cadastrados</p>
          </div>
          <div className="leads-map-filters">
            <button
              onClick={openCreateModal}
              className="leads-map-route-button"
            >
              + Novo vendedor
            </button>
          </div>
        </div>
      </div>

      <div className="leads-map-map-container" style={{ padding: 16 }}>
        <div className="table-container">
          <table className="editable-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.responsibleRegion}</td>
                  <td>{s.city}</td>
                  <td>{s.state}</td>
                </tr>
              ))}
              {sellers.length === 0 && (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="leads-map-route-empty" style={{ padding: 24 }}>
                      Nenhum vendedor cadastrado ainda.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreating && (
        <div className="leads-map-modal-overlay" onClick={closeCreateModal}>
          <div className="leads-map-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="leads-map-route-panel-title" style={{ marginBottom: 12 }}>Novo vendedor</h3>
            {formErrors._root && (
              <p className="leads-map-error-text" style={{ marginBottom: 8 }}>{formErrors._root}</p>
            )}
            <form onSubmit={handleSubmit} className="leads-overlay-container">
              <div className="leads-map-form-grid">
                <div className="leads-map-form-field">
                  <label>Nome</label>
                  <input type="text" value={form.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                  {formErrors.name && <span className="leads-map-form-error">{formErrors.name}</span>}
                </div>
                <div className="leads-map-form-field">
                  <label>E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                  {formErrors.email && <span className="leads-map-form-error">{formErrors.email}</span>}
                </div>
                <div className="leads-map-form-field">
                  <label>Telefone</label>
                  <input type="tel" value={form.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                  {formErrors.phone && <span className="leads-map-form-error">{formErrors.phone}</span>}
                </div>
                <div className="leads-map-form-field">
                  <label>Data de nascimento</label>
                  <input type="date" value={form.birthDate} onChange={(e) => handleInputChange('birthDate', e.target.value)} />
                  {formErrors.birthDate && <span className="leads-map-form-error">{formErrors.birthDate}</span>}
                </div>
                <div className="leads-map-form-field">
                  <label>Endereço</label>
                  <input type="text" value={form.address} onChange={(e) => handleInputChange('address', e.target.value)} />
                </div>
                <div className="leads-map-form-field">
                  <label>CEP</label>
                  <input type="text" value={form.zipCode} onChange={(e) => handleInputChange('zipCode', e.target.value)} />
                </div>
                <div className="leads-map-form-field">
                  <label>Cidade</label>
                  <input type="text" value={form.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                  {formErrors.city && <span className="leads-map-form-error">{formErrors.city}</span>}
                </div>
                <div className="leads-map-form-field">
                  <label>UF</label>
                  <input type="text" value={form.state} onChange={(e) => handleInputChange('state', e.target.value)} maxLength={2} />
                  {formErrors.state && <span className="leads-map-form-error">{formErrors.state}</span>}
                </div>
                <div className="leads-map-form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Região responsável</label>
                  <input type="text" value={form.responsibleRegion} onChange={(e) => handleInputChange('responsibleRegion', e.target.value)} />
                  {formErrors.responsibleRegion && <span className="leads-map-form-error">{formErrors.responsibleRegion}</span>}
                </div>

              </div>

              <div className="leads-map-modal-actions">
                <button type="button" className="seller-cancel-button" onClick={closeCreateModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className={`seller-save-button ${saving ? 'leads-map-route-optimizing' : ''}`} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sellers;


