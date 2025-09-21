import React, { useState, useEffect } from 'react'
import { Search, CreditCard, Calendar, User, GraduationCap, DollarSign, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Student {
  id: string
  name: string
  class: string
  roll: string
}

interface Invoice {
  id: string
  amount: number
  due_date: string
  status: string
  pay_link?: string
}

interface StudentWithInvoices extends Student {
  invoices: Invoice[]
}

export function ParentPaymentPage() {
  const [searchName, setSearchName] = useState('')
  const [searchClass, setSearchClass] = useState('')
  const [searchRoll, setSearchRoll] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentWithInvoices | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState<string | null>(null)

  // Check for pay link token on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    if (token) {
      handleTokenSearch(token)
    }
  }, [])

  const handleTokenSearch = async (token: string) => {
    setLoading(true)
    setError('')
    setSelectedStudent(null)

    try {
      // Find invoice by pay_link token
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('student_id')
        .eq('pay_link', token)
        .single()

      if (invoiceError || !invoice) {
        setError('Invoice not found — try searching below.')
        return
      }

      // Get student and all their invoices
      await fetchStudentInvoices(invoice.student_id)
    } catch (err: any) {
      setError('Invoice not found — try searching below.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentInvoices = async (studentId: string) => {
    try {
      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, class, roll')
        .eq('id', studentId)
        .single()

      if (studentError || !student) {
        setError('Student not found.')
        return
      }

      // Get all invoices for this student
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, amount, due_date, status, pay_link')
        .eq('student_id', studentId)
        .order('due_date', { ascending: false })

      if (invoicesError) {
        setError('Failed to load invoices.')
        return
      }

      setSelectedStudent({
        ...student,
        invoices: invoices || []
      })
    } catch (err: any) {
      setError('An error occurred while loading student data.')
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchName.trim() && !searchClass.trim() && !searchRoll.trim()) {
      setError('Please enter at least one search criteria')
      return
    }

    setLoading(true)
    setError('')
    setStudents([])
    setSelectedStudent(null)

    try {
      let query = supabase.from('students').select('id, name, class, roll')

      // Build query based on search criteria
      if (searchName.trim()) {
        query = query.ilike('name', `%${searchName.trim()}%`)
      }
      if (searchClass.trim()) {
        query = query.eq('class', searchClass.trim())
      }
      if (searchRoll.trim()) {
        query = query.eq('roll', searchRoll.trim())
      }

      const { data: results, error } = await query.limit(10)

      if (error) throw error

      if (!results || results.length === 0) {
        setError('No student found')
        return
      }

      if (results.length === 1) {
        // Auto-show invoices for single result
        await fetchStudentInvoices(results[0].id)
      } else {
        // Show multiple results
        setStudents(results)
      }
    } catch (err: any) {
      setError('An error occurred while searching.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewInvoices = async (studentId: string) => {
    await fetchStudentInvoices(studentId)
    setStudents([])
  }

  const handlePaymentSubmission = async (invoiceId: string) => {
    if (!paymentRef.trim()) {
      alert('Please enter a payment reference number')
      return
    }

    setSubmittingPayment(invoiceId)
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          reference_number: paymentRef.trim(),
          status: 'pending'
        })

      if (error) throw error

      alert('Payment confirmation submitted successfully! We will verify and update the status.')
      setPaymentRef('')
    } catch (err: any) {
      alert('Failed to submit payment confirmation. Please try again.')
    } finally {
      setSubmittingPayment(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDateString: string) => {
    return new Date(dueDateString) < new Date()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fee Payment</h1>
          <p className="text-gray-600">Search for student to view fee details</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="searchName" className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name
                </label>
                <input
                  id="searchName"
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter name..."
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="searchClass" className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <input
                  id="searchClass"
                  type="text"
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., 10A"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="searchRoll" className="block text-sm font-medium text-gray-700 mb-2">
                  Roll No
                </label>
                <input
                  id="searchRoll"
                  type="text"
                  value={searchRoll}
                  onChange={(e) => setSearchRoll(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Roll number"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-6 rounded-lg font-medium text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? 'Searching...' : 'Search Student'}
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Multiple Students Results */}
        {students.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Multiple students found:</h3>
            <div className="space-y-3">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{student.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">
                      Class: {student.class || 'N/A'} | Roll: {student.roll || 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewInvoices(student.id)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Invoices</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Invoices */}
        {selectedStudent && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Student Header */}
            <div className="bg-blue-50 border-b border-blue-200 p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.name || 'N/A'}</h2>
                <div className="flex items-center justify-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5" />
                    <span>Class: {selectedStudent.class || 'N/A'}</span>
                  </div>
                  <div className="text-gray-400">•</div>
                  <span>Roll: {selectedStudent.roll || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Invoices</h3>
              {selectedStudent.invoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No invoices found for this student.</p>
              ) : (
                <div className="space-y-4">
                  {selectedStudent.invoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-xl font-bold text-gray-900">
                              {formatCurrency(invoice.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {invoice.status === 'paid' ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              <span>Paid</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                              isOverdue(invoice.due_date) 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              <AlertCircle className="w-4 h-4" />
                              <span>{isOverdue(invoice.due_date) ? 'Overdue' : 'Unpaid'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {formatDate(invoice.due_date)}</span>
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        Invoice ID: {invoice.id}
                      </div>

                      {invoice.status !== 'paid' && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              value={paymentRef}
                              onChange={(e) => setPaymentRef(e.target.value)}
                              placeholder="Enter payment reference number"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handlePaymentSubmission(invoice.id)}
                              disabled={submittingPayment === invoice.id}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                            >
                              {submittingPayment === invoice.id ? 'Submitting...' : 'I Paid'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}