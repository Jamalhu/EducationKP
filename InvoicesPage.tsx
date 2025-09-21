import React, { useState } from 'react'
import { Plus, Edit, Trash2, Receipt, Search, CheckCircle, Clock, FileText, Calendar, DollarSign, Send, MessageSquare, Copy, Download, FileDown } from 'lucide-react'
import { useInvoices, Invoice } from '../hooks/useInvoices'
import { supabase } from '../lib/supabase'
import { InvoiceForm } from './InvoiceForm'

export function InvoicesPage() {
  const { invoices, loading, error, addInvoice, updateInvoice, markAsPaid, deleteInvoice } = useInvoices()
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'draft'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<any>(null)
  const [showReminders, setShowReminders] = useState(false)
  const [daysAhead, setDaysAhead] = useState(3)
  const [generatingReminders, setGeneratingReminders] = useState(false)
  const [reminderData, setReminderData] = useState<any[]>([])

  const [exportingCSV, setExportingCSV] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  const exportPaidInvoicesCSV = async () => {
    setExportingCSV(true)
    try {
      const { data: paidInvoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          due_date,
          payment_date,
          created_at,
          parent_name,
          parent_contact,
          student:students(name, class, roll)
        `)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch invoices: ${error.message}`)
      }

      if (!paidInvoices || paidInvoices.length === 0) {
        alert('No paid invoices found to export.')
        return
      }

      const csvContent = [
        'invoice_id,student_name,class,roll,amount,due_date,payment_date,created_at,father_name,father_contact',
        ...(paidInvoices || []).map(inv => 
          `"${inv.id || ''}","${inv.student?.name || ''}","${inv.student?.class || ''}","${inv.student?.roll || ''}","${inv.amount || 0}","${inv.due_date || ''}","${inv.payment_date || ''}","${inv.created_at || ''}","${inv.parent_name || ''}","${inv.parent_contact || ''}"`
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paid-invoices-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    } finally {
      setExportingCSV(false)
    }
  }

  const generatePDFReceipt = async () => {
    setGeneratingPDF(true)
    try {
      const { data: paidInvoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          due_date,
          payment_date,
          created_at,
          parent_name,
          parent_contact,
          student:students(name, class, roll)
        `)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch invoices: ${error.message}`)
      }

      if (!paidInvoices || paidInvoices.length === 0) {
        alert('No paid invoices found to generate receipt.')
        return
      }

      // Create a simple HTML receipt
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Paid Invoices Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .total { font-weight: bold; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Paid Invoices Receipt</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Father Name</th>
                <th>Father Contact</th>
                <th>Amount</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              ${(paidInvoices || []).map(inv => `
                <tr>
                  <td>${inv.id || ''}</td>
                  <td>${inv.student?.name || ''}</td>
                  <td>${inv.student?.class || ''}</td>
                  <td>${inv.parent_name || 'N/A'}</td>
                  <td>${inv.parent_contact || 'N/A'}</td>
                  <td>PKR ${inv.amount || 0}</td>
                  <td>${inv.payment_date ? new Date(inv.payment_date).toLocaleDateString() : ''}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="5">Total</td>
                <td>PKR ${(paidInvoices || []).reduce((sum, inv) => sum + (inv.amount || 0), 0)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `

      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paid-invoices-receipt-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate receipt. Please try again.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.amount?.toString().includes(searchTerm) ||
      invoice.due_date?.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleAddInvoice = async (invoiceData: Omit<Invoice, 'id' | 'student' | 'created_at'>) => {
    return await addInvoice(invoiceData)
  }

  const handleEditInvoice = async (invoiceData: Omit<Invoice, 'id' | 'student' | 'created_at'>) => {
    if (!editingInvoice) return { success: false, error: 'No invoice selected' }
    return await updateInvoice(editingInvoice.id, invoiceData)
  }

  const handleMarkAsPaid = async (id: string) => {
    await markAsPaid(id)
  }

  const handleDeleteInvoice = async (id: string) => {
    const result = await deleteInvoice(id)
    if (result.success) {
      setDeleteConfirm(null)
    }
    return result
  }

  const handleSendReminders = async () => {
    setSendingReminders(true)
    setReminderResult(null)
    
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setReminderResult(result)
    } catch (error) {
      setReminderResult({
        success: false,
        error: error.message || 'Failed to send reminders'
      })
    } finally {
      setSendingReminders(false)
    }
  }

  const handleGenerateReminders = async () => {
    setGeneratingReminders(true)
    try {
      // Calculate target date
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + daysAhead)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      // Fetch unpaid invoices due within specified days
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          due_date,
          student:students(
            id,
            name,
            student_parents(
              parent:parents(
                id,
                name,
                phone
              )
            )
          )
        `)
        .eq('status', 'unpaid')
        .lte('due_date', targetDateStr)

      if (invoicesError) throw invoicesError

      const reminders = []
      
      for (const invoice of invoices || []) {
        if (!invoice.student?.student_parents) continue

        for (const studentParent of invoice.student.student_parents) {
          const parent = studentParent.parent
          if (!parent?.phone) continue

          const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB')
          const message = `Assalamualaikum ${parent.name}, ${invoice.student.name} ki fees PKR ${invoice.amount} due hai (Due: ${dueDate}). Pay link: https://your-payment-link.com/pay/${invoice.id}`

          reminders.push({
            parentName: parent.name,
            phone: parent.phone,
            studentName: invoice.student.name,
            amount: invoice.amount,
            dueDate: invoice.due_date,
            message: message,
            invoiceId: invoice.id
          })

          // Log to sms_logs table
          await supabase
            .from('sms_logs')
            .insert({
              target_phone: parent.phone,
              message: message
            })
        }
      }

      setReminderData(reminders)
      setShowReminders(true)
    } catch (error) {
      console.error('Error generating reminders:', error)
      alert('Failed to generate reminders. Please try again.')
    } finally {
      setGeneratingReminders(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy to clipboard')
    })
  }

  const copyAllMessages = () => {
    const allMessages = reminderData.map(r => r.message).join('\n\n')
    copyToClipboard(allMessages)
  }

  const openWhatsApp = (phone: string, message: string) => {
    // Format phone number - remove any non-digits and ensure it starts with country code
    let formattedPhone = phone.replace(/\D/g, '')
    
    // If phone doesn't start with country code, assume Pakistan (+92)
    if (!formattedPhone.startsWith('92')) {
      // Remove leading 0 if present and add 92
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '92' + formattedPhone.substring(1)
      } else {
        formattedPhone = '92' + formattedPhone
      }
    }
    
    // URL encode the message
    const encodedMessage = encodeURIComponent(message)
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    
    // Open in new tab
    window.open(whatsappUrl, '_blank')
  }

  const downloadCSV = () => {
    const csvContent = [
      'phone,message,student,amount,due_date',
      ...reminderData.map(r => 
        `"${r.phone}","${r.message}","${r.studentName}","${r.amount}","${r.dueDate}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fee-reminders-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const openEditForm = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingInvoice(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'unpaid':
        return <Clock className="w-4 h-4 text-red-600" />
      case 'draft':
        return <FileText className="w-4 h-4 text-gray-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'unpaid':
        return 'bg-red-100 text-red-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
            <Receipt className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
            <p className="text-gray-600">Manage student invoices and payments</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSendReminders}
            disabled={sendingReminders}
            className="inline-flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{sendingReminders ? 'Sending...' : 'Send Reminders'}</span>
          </button>
          <button
            onClick={() => setShowReminders(!showReminders)}
            className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Generate Reminders</span>
          </button>
          <button
            onClick={exportPaidInvoicesCSV}
            disabled={exportingCSV}
            className="inline-flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{exportingCSV ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={generatePDFReceipt}
            disabled={generatingPDF}
            className="inline-flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>{generatingPDF ? 'Generating...' : 'Download Receipt'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Reminder Result */}
      {reminderResult && (
        <div className={`rounded-lg p-4 ${reminderResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {reminderResult.success ? (
            <div>
              <h3 className="font-medium text-green-800 mb-2">Reminders Sent Successfully!</h3>
              <p className="text-green-700">
                Sent {reminderResult.remindersSent} reminders for {reminderResult.totalInvoices} unpaid invoices due within 3 days.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-medium text-red-800 mb-2">Failed to Send Reminders</h3>
              <p className="text-red-700">{reminderResult.error}</p>
            </div>
          )}
          <button
            onClick={() => setReminderResult(null)}
            className="mt-2 text-sm underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Generate Reminders Panel */}
      {showReminders && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Generate Fee Reminders</h3>
            <button
              onClick={() => setShowReminders(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due within days:
              </label>
              <input
                type="number"
                value={daysAhead}
                onChange={(e) => setDaysAhead(parseInt(e.target.value) || 3)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="30"
              />
            </div>
            <button
              onClick={handleGenerateReminders}
              disabled={generatingReminders}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {generatingReminders ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {reminderData.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <button
                  onClick={copyAllMessages}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy All Messages</span>
                </button>
                <button
                  onClick={downloadCSV}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
                <span className="text-sm text-gray-600">
                  {reminderData.length} reminders generated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">Parent</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">Phone</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">Student</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">Due Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">Message Preview</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reminderData.map((reminder, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{reminder.parentName}</td>
                        <td className="px-3 py-2 text-gray-600">{reminder.phone}</td>
                        <td className="px-3 py-2 text-gray-900">{reminder.studentName}</td>
                        <td className="px-3 py-2 text-gray-900">PKR {reminder.amount}</td>
                        <td className="px-3 py-2 text-gray-600">{formatDate(reminder.dueDate)}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={reminder.message}>
                          {reminder.message}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => copyToClipboard(reminder.message)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Copy message"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openWhatsApp(reminder.phone, reminder.message)}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Send on WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, amount, or due date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No invoices found' : 'No invoices yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria' 
                : 'Get started by creating your first invoice'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Invoice</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Due Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {invoice.student ? (
                        <div>
                          <div className="font-medium text-gray-900">{invoice.student.name}</div>
                          <div className="text-sm text-gray-500">
                            Class: {invoice.student.class} | Roll: {invoice.student.roll}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Student not found</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(invoice.due_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        <span className="capitalize">{invoice.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as paid"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {invoice.status === 'paid' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        )}
                        <button
                          onClick={() => openEditForm(invoice)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(invoice.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          onSubmit={editingInvoice ? handleEditInvoice : handleAddInvoice}
          onClose={closeForm}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Invoice</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this invoice? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteInvoice(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}