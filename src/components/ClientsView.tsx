import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Clock,
  Edit2,
  Check,
  CreditCard,
  History,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Client } from '../types';
import { formatCurrency, formatDate, maskPhone, formatPhone } from '../utils/formatters';

export const ClientsView: React.FC = () => {
  const { clients, sales, receivables, addClient, updateClient } = useErp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modal create/edit client
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.neighborhood.toLowerCase().includes(term) ||
      c.address.toLowerCase().includes(term)
    );
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setAddress('');
    setNeighborhood('');
    setReference('');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address);
    setNeighborhood(c.neighborhood);
    setReference(c.reference || '');
    setNotes(c.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateClient(editingId, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addClient({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Clientes
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Cadastro e histórico de quem compra com você.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cliente por nome, telefone, bairro ou rua..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((client) => {
          // Client purchase stats
          const clientSales = sales.filter((s) => s.clientId === client.id);
          const clientReceivables = receivables.filter(
            (r) => r.clientId === client.id && r.status !== 'pago'
          );
          const debtTotal = clientReceivables.reduce(
            (acc, r) => acc + r.remainingAmount,
            0
          );

          return (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {client.name}
                  </h3>
                  <button
                    onClick={() => handleOpenEdit(client)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Phone */}
                {client.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold mb-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${client.phone.replace(/\D/g, '')}`} className="hover:underline">
                      {formatPhone(client.phone)}
                    </a>
                  </div>
                )}

                {/* Address */}
                <div className="text-xs text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span>{client.address}</span>
                    {client.neighborhood && (
                      <span className="font-semibold block text-slate-800">
                        Bairro: {client.neighborhood}
                      </span>
                    )}
                    {client.reference && (
                      <span className="text-[11px] text-slate-400 block italic">
                        Ref: {client.reference}
                      </span>
                    )}
                  </div>
                </div>

                {client.notes && (
                  <div className="text-[11px] text-slate-500 italic mt-2 bg-slate-50 p-1.5 rounded">
                    Obs: {client.notes}
                  </div>
                )}
              </div>

              {/* Bottom stats: Purchases & Debt */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {clientSales.length} pedidos feitos
                </span>

                {debtTotal > 0 ? (
                  <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                    Deve: {formatCurrency(debtTotal)}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg">
                    Em dia
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit Client */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Telefone / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="(89) 9 9999 - 9999"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Endereço (Rua, Número, Bloco/Apto)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rua São Paulo, 120, Apto 201"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ponto de Referência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ao lado da padaria"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Observações Gerais
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cliente prefere botijão da Ultragaz"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Salvar Dados do Cliente
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
