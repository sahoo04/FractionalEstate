'use client'

import React, { useState, useRef, ChangeEvent } from 'react'
import { X, Upload, FileIcon, Image as ImageIcon } from 'lucide-react'
import { validateMultipleBillFiles, formatFileSize, getFileIcon } from '@/lib/pinata'

export interface BillFileWithCategory extends File {
  category: 'electricity' | 'water' | 'gas' | 'repairs' | 'cleaning' | 'other'
  description: string
  preview?: string
}

interface MultiFileUploadProps {
  onFilesChange: (files: BillFileWithCategory[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
}

export default function MultiFileUpload({
  onFilesChange,
  maxFiles = 20,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<BillFileWithCategory[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const fileArray = Array.from(selectedFiles)
    
    // Validate files
    const validation = validateMultipleBillFiles(fileArray)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    // Check total files limit
    if (files.length + fileArray.length > maxFiles) {
      setErrors([`Maximum ${maxFiles} files allowed. You have ${files.length} files already.`])
      return
    }

    // Process files
    const newFiles = fileArray.map((file) => {
      const fileWithMeta = file as BillFileWithCategory
      fileWithMeta.category = 'other' // Default category
      fileWithMeta.description = ''
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          fileWithMeta.preview = e.target?.result as string
          setFiles([...files, ...newFiles])
        }
        reader.readAsDataURL(file)
      }
      
      return fileWithMeta
    })

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
    setErrors([])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const updateFileCategory = (index: number, category: BillFileWithCategory['category']) => {
    const updatedFiles = [...files]
    updatedFiles[index].category = category
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const updateFileDescription = (index: number, description: string) => {
    const updatedFiles = [...files]
    updatedFiles[index].description = description
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Supported: JPG, PNG, WEBP, PDF (Max 10MB per file, up to {maxFiles} files)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Select Files
        </button>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Upload Errors:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Uploaded Files ({files.length}/{maxFiles})
            </h3>
            <button
              type="button"
              onClick={() => {
                setFiles([])
                onFilesChange([])
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-2xl">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                      <select
                        value={file.category}
                        onChange={(e) =>
                          updateFileCategory(index, e.target.value as BillFileWithCategory['category'])
                        }
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="electricity">Electricity Bill</option>
                        <option value="water">Water Bill</option>
                        <option value="gas">Gas Bill</option>
                        <option value="repairs">Repairs & Maintenance</option>
                        <option value="cleaning">Cleaning Service</option>
                        <option value="other">Other Expense</option>
                      </select>

                      {/* Description Input */}
                      <input
                        type="text"
                        placeholder="Brief description (optional)"
                        value={file.description}
                        onChange={(e) => updateFileDescription(index, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
