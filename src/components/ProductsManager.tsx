import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Trash2, Plus, Edit2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuthLaravel'
import { formatCurrency } from '../utils/formatters'
import { getApiUrl } from '../utils/apiConfig'

interface Product {
  id: number
  name: string
  recurrence: 'unique' | 'recurring'
  price: number
  observations?: string
  created_at: string
  updated_at: string
}

interface ProductsManagerProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded?: () => void
}

export function ProductsManager({ isOpen, onClose, onProductAdded }: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    recurrence: 'unique' as 'unique' | 'recurring',
    price: '',
    observations: '',
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const { accessToken } = useAuth()

  const baseUrl = getApiUrl()

  const getHeaders = (withBody = false) => {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    }
    if (withBody) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  // Carregar produtos
  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${baseUrl}/products`, {
        headers: getHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadProducts()
    }
  }, [isOpen])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.price || parseFloat(formData.price as string) < 0) {
      toast.error('Preço inválido')
      return
    }

    try {
      const payload = {
        name: formData.name.trim(),
        recurrence: formData.recurrence,
        price: parseFloat(formData.price as string),
        observations: formData.observations.trim() || null,
      }

      if (editingId) {
        // Atualizar
        const response = await fetch(`${baseUrl}/products/${editingId}`, {
          method: 'PUT',
          headers: getHeaders(true),
          body: JSON.stringify(payload)
        })
        if (response.ok) {
          const data = await response.json()
          setProducts(products.map(p => p.id === editingId ? data.product : p))
          toast.success('Produto atualizado com sucesso')
          resetForm()
        } else {
          toast.error('Erro ao atualizar produto')
        }
      } else {
        // Criar
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify(payload)
        })
        if (response.ok) {
          const data = await response.json()
          setProducts([data.product, ...products])
          toast.success('Produto criado com sucesso')
          resetForm()
          onProductAdded?.()
        } else {
          toast.error('Erro ao criar produto')
        }
      }
    } catch (error) {
      toast.error('Erro ao salvar produto')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return

    try {
      const response = await fetch(`${baseUrl}/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (response.ok) {
        setProducts(products.filter(p => p.id !== id))
        toast.success('Produto deletado com sucesso')
      } else {
        toast.error('Erro ao deletar produto')
      }
    } catch (error) {
      toast.error('Erro ao deletar produto')
    }
  }

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      recurrence: product.recurrence,
      price: product.price.toString(),
      observations: product.observations || '',
    })
    setEditingId(product.id)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      recurrence: 'unique',
      price: '',
      observations: '',
    })
    setEditingId(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Gerenciar Produtos/Serviços
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Formulário */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto/Serviço *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Consultoria Web"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Recorrência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recorrência *
                </label>
                <select
                  value={formData.recurrence}
                  onChange={(e) => handleInputChange('recurrence', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unique">Único</option>
                  <option value="recurring">Recorrente</option>
                </select>
              </div>

              {/* Preço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Inclui 5 horas de consultoria..."
                  value={formData.observations}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Textarea para observações */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Detalhada (opcional)
              </label>
              <textarea
                placeholder="Descreva em detalhes o produto/serviço..."
                value={formData.observations}
                onChange={(e) => handleInputChange('observations', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editingId ? 'Atualizar' : 'Criar'} Produto
              </Button>
              {editingId && (
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="text-gray-700"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Produtos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Meus Produtos ({products.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando produtos...
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum produto criado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Produto</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Preço</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Observações</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            product.recurrence === 'unique'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.recurrence === 'unique' ? 'Único' : 'Recorrente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                          {product.observations || '-'}
                        </td>
                        <td className="px-4 py-3 text-center space-x-2 flex justify-center">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-900 transition p-1"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900 transition p-1"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="text-gray-700"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
