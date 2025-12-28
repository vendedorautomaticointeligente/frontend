import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { ChevronLeft, ChevronRight, Search, Download, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CampaignLog {
  id: string
  campaign_id: string
  contact_id: string
  contact_name: string
  contact_phone: string
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'replied' | 'queued'
  error_message: string | null
  error_category: string | null
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
  replied_at: string | null
  response_time: number | null
  metadata: Record<string, any>
}

interface DetailedLogsTableProps {
  logs: CampaignLog[]
  onExport?: () => void
}

const ITEMS_PER_PAGE = 20

const STATUS_CONFIG = {
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800' },
  opened: { label: 'Aberto', color: 'bg-purple-100 text-purple-800' },
  replied: { label: 'Respondeu', color: 'bg-yellow-100 text-yellow-800' },
  queued: { label: 'Na Fila', color: 'bg-gray-100 text-gray-800' }
}

export function DetailedLogsTable({ logs, onExport }: DetailedLogsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'sent_at' | 'contact_name' | 'status'>('sent_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filtrar e ordenar logs
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = logs.filter(log => {
      const matchesSearch = searchTerm === '' ||
        log.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.contact_phone.includes(searchTerm) ||
        (log.error_message && log.error_message.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || log.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'sent_at':
          aValue = new Date(a.sent_at).getTime()
          bValue = new Date(b.sent_at).getTime()
          break
        case 'contact_name':
          aValue = a.contact_name.toLowerCase()
          bValue = b.contact_name.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [logs, searchTerm, statusFilter, sortBy, sortOrder])

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedLogs = filteredAndSortedLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return '↕️'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const formatResponseTime = (seconds: number | null) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Logs Detalhados</CardTitle>
            <p className="text-sm text-muted-foreground">
              Histórico completo dos envios ({filteredAndSortedLogs.length} registros)
            </p>
          </div>
          {onExport && (
            <Button onClick={onExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, telefone ou erro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('contact_name')}
                >
                  Contato {getSortIcon('contact_name')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('sent_at')}
                >
                  Enviado em {getSortIcon('sent_at')}
                </TableHead>
                <TableHead>Entregue em</TableHead>
                <TableHead>Tempo de Resposta</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.contact_name}</div>
                        <div className="text-sm text-muted-foreground">{log.contact_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[log.status].color}>
                        {STATUS_CONFIG[log.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(log.sent_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.delivered_at ? formatDateTime(log.delivered_at) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatResponseTime(log.response_time)}
                    </TableCell>
                    <TableCell>
                      {log.error_message ? (
                        <div className="max-w-xs">
                          <div className="text-sm text-red-600 truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                          {log.error_category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {log.error_category}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredAndSortedLogs.length)} de {filteredAndSortedLogs.length} registros
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}