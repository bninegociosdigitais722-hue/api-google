'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type ActivityRow = {
  id: string
  atividade: string
  contato: string
  canal: string
  status: 'Concluído' | 'Pendente' | 'Alerta'
  data: string
}

const statusVariant: Record<ActivityRow['status'], 'success' | 'secondary' | 'warning'> = {
  Concluído: 'success',
  Pendente: 'secondary',
  Alerta: 'warning',
}

const columns: ColumnDef<ActivityRow>[] = [
  { accessorKey: 'atividade', header: 'Atividade' },
  { accessorKey: 'contato', header: 'Contato' },
  { accessorKey: 'canal', header: 'Canal' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>
    ),
  },
  { accessorKey: 'data', header: 'Quando' },
]

export default function RecentActivityTable({ data }: { data: ActivityRow[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 shadow-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Sem atividades recentes.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
