import React, { useEffect, useMemo, useState, useRef } from 'react';
import { sellersAPI } from '../services/api';
import { Seller, CreateSellerRequest } from '../types';
import './LeadsMap.css';

const Sellers: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    { key: 'actions', label: 'Ações' },
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

  // Geocodificar automaticamente quando endereço/cidade/UF/CEP mudarem
  useEffect(() => {
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      const { address, city, state, zipCode } = form;
      const queryParts = [address, city, state, zipCode].filter(Boolean);
      if (queryParts.length < 2) return; // precisa de pelo menos 2 partes para qualidade

      try {
        setIsGeocoding(true);
        const q = encodeURIComponent(queryParts.join(', '));
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
        const resp = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = Number(data[0].lat);
          const lon = Number(data[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
          }
        }
      } catch (e) {
        // silenciar erros de geocodificação
      } finally {
        setIsGeocoding(false);
      }
    }, 700); // debounce 700ms

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
        geocodeTimeoutRef.current = null;
      }
    };
  }, [form.address, form.city, form.state, form.zipCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSaving(true);
      let result: Seller;
      if (editingId) {
        const payload = { ...form } as any;
        result = await sellersAPI.update(editingId, payload);
        setSellers((prev) => prev.map((s) => s.id === editingId ? result : s));
      } else {
        result = await sellersAPI.create(form);
        setSellers((prev) => [result, ...prev]);
      }
      setIsCreating(false);
      setEditingId(null);
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
                  <td>
                    <div className="row-actions" style={{ flexDirection: 'row', gap: '8px' }}>
                      <button
                        type="button"
                        className="action-button edit"
                        onClick={() => { setForm({
                          name: s.name,
                          birthDate: s.birthDate?.slice(0,10) || '',
                          phone: s.phone,
                          email: s.email,
                          address: s.address,
                          city: s.city,
                          state: s.state,
                          zipCode: s.zipCode,
                          responsibleRegion: s.responsibleRegion,
                          latitude: s.latitude ?? undefined,
                          longitude: s.longitude ?? undefined,
                        }); setEditingId(s.id); setIsCreating(true); }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="action-button delete"
                        onClick={async () => {
                          if (!window.confirm('Confirmar exclusão deste vendedor?')) return;
                          try {
                            await sellersAPI.delete(s.id);
                            setSellers((prev) => prev.filter((x) => x.id !== s.id));
                          } catch (e) {
                            alert('Falha ao excluir.');
                          }
                        }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
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
                   {isGeocoding && <span className="leads-map-form-error" style={{ color: '#6b7280' }}>Buscando coordenadas…</span>}
                </div>
                 <div className="leads-map-form-field">
                   <label>Latitude (opcional)</label>
                   <input type="number" step="any" value={form.latitude ?? ''} onChange={(e) => handleInputChange('latitude', e.target.value)} />
                 </div>
                 <div className="leads-map-form-field">
                   <label>Longitude (opcional)</label>
                   <input type="number" step="any" value={form.longitude ?? ''} onChange={(e) => handleInputChange('longitude', e.target.value)} />
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


