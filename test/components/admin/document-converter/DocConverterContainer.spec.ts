import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DocConverterContainer from '@/components/admin/document-converter/DocConverterContainer.vue';

// Mock all imported components
vi.mock('@/components/admin/document-converter/FileUpload.vue', () => ({
  default: {
    name: 'FileUpload',
    props: ['isUploading', 'allowedExtensions', 'maxFileSize'],
    template: '<div class="mock-file-upload"></div>'
  }
}));

vi.mock('@/components/admin/document-converter/ConversionProgress.vue', () => ({
  default: {
    name: 'ConversionProgress',
    props: ['progress', 'currentStep', 'estimatedTime'],
    template: '<div class="mock-conversion-progress"></div>'
  }
}));

vi.mock('@/components/admin/document-converter/ConversionResult.vue', () => ({
  default: {
    name: 'ConversionResult',
    props: ['result'],
    template: '<div class="mock-conversion-result"></div>'
  }
}));

vi.mock('@/components/admin/document-converter/DocumentList.vue', () => ({
  default: {
    name: 'DocumentList',
    props: ['documents', 'selectedDocument', 'loading'],
    template: '<div class="mock-document-list"></div>'
  }
}));

vi.mock('@/components/admin/document-converter/ErrorDisplay.vue', () => ({
  default: {
    name: 'ErrorDisplay',
    props: ['error'],
    template: '<div class="mock-error-display"></div>'
  }
}));

vi.mock('@/components/admin/document-converter/FallbackConverter.vue', () => ({
  default: {
    name: 'FallbackConverter',
    template: '<div class="mock-fallback-converter"></div>'
  }
}));

// Mock composables
vi.mock('@/composables/useDocumentConverter', () => ({
  useDocumentConverter: () => ({
    isInitialized: vi.fn().mockReturnValue(true),
    error: vi.ref(null),
    isConverting: vi.ref(false),
    documents: vi.ref([
      {
        id: 'doc1',
        originalName: 'Document 1.pdf',
        originalFormat: 'pdf',
        size: 1024 * 1024,
        status: 'success',
        convertedAt: new Date('2023-01-01T10:00:00Z')
      }
    ]),
    selectedDocument: vi.ref(null),
    isUploading: vi.ref(false),
    isLoading: vi.ref(false),
    initialize: vi.fn().mockResolvedValue(true),
    uploadDocument: vi.fn().mockResolvedValue('doc2'),
    convertDocument: vi.fn().mockResolvedValue(true),
    selectDocument: vi.fn(),
    cancelConversion: vi.fn().mockResolvedValue(true),
    clearSelection: vi.fn(),
    deleteDocument: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('@/composables/useFeatureToggles', () => ({
  useFeatureToggles: () => ({
    isDocConverterEnabled: true
  })
}));

vi.mock('@/composables/useDialog', () => ({
  useGlobalDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    error: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => fallback || key
  })
}));

// Helper function to create the wrapper
const createWrapper = (options = {}) => {
  return mount(DocConverterContainer, {
    ...options,
    global: {
      mocks: {
        ...options?.global?.mocks,
        // Add any global mocks needed here
      },
      stubs: {
        ...options?.global?.stubs,
        // Add any global stubs needed here
      }
    }
  });
};

describe('DocConverterContainer.vue', () => {
  // Rendering tests
  describe('Rendering', () => {
    it('renders the component correctly when feature is enabled', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.doc-converter-container').exists()).toBe(true);
      expect(wrapper.find('.doc-converter-header').exists()).toBe(true);
      expect(wrapper.find('.doc-converter-content').exists()).toBe(true);
    });
    
    it('does not render when feature is disabled', () => {
      // Override the mock to return feature disabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isDocConverterEnabled: false
      });
      
      const wrapper = createWrapper();
      
      expect(wrapper.find('.doc-converter-container').exists()).toBe(false);
      
      // Reset the mock for other tests
      vi.mocked(useFeatureToggles).mockReset();
    });
    
    it('renders error display when there is an error', async () => {
      const wrapper = createWrapper();
      
      // Manually set error state
      await wrapper.setData({ error: new Error('Test error') });
      
      expect(wrapper.find('.mock-error-display').exists()).toBe(true);
      expect(wrapper.find('.doc-converter-content').exists()).toBe(false);
    });
    
    it('renders file upload when not converting and no result', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.mock-file-upload').exists()).toBe(true);
      expect(wrapper.find('.mock-conversion-progress').exists()).toBe(false);
      expect(wrapper.find('.mock-conversion-result').exists()).toBe(false);
    });
    
    it('renders conversion progress when converting', async () => {
      const wrapper = createWrapper();
      
      // Manually set converting state
      await wrapper.setData({ isConverting: true });
      
      expect(wrapper.find('.mock-conversion-progress').exists()).toBe(true);
      expect(wrapper.find('.mock-file-upload').exists()).toBe(false);
    });
    
    it('renders conversion result when a result is available', async () => {
      const wrapper = createWrapper();
      
      // Manually set conversion result
      await wrapper.setData({ 
        conversionResult: {
          id: 'doc1',
          originalName: 'test.pdf',
          originalFormat: 'pdf',
          status: 'success'
        }
      });
      
      expect(wrapper.find('.mock-conversion-result').exists()).toBe(true);
      expect(wrapper.find('.mock-file-upload').exists()).toBe(false);
    });
    
    it('renders document list', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.mock-document-list').exists()).toBe(true);
    });
    
    it('renders fallback converter when fallback is needed', async () => {
      const wrapper = createWrapper();
      
      // Manually set fallback state
      await wrapper.setData({ useFallback: true });
      
      expect(wrapper.find('.mock-fallback-converter').exists()).toBe(true);
    });
    
    it('shows controls for new conversion when there is a result', async () => {
      const wrapper = createWrapper();
      
      // Initially, controls should not be visible
      expect(wrapper.find('.doc-converter-controls').exists()).toBe(false);
      
      // Set a conversion result
      await wrapper.setData({ 
        conversionResult: {
          id: 'doc1',
          originalName: 'test.pdf',
          originalFormat: 'pdf',
          status: 'success'
        }
      });
      
      // Now controls should be visible
      expect(wrapper.find('.doc-converter-controls').exists()).toBe(true);
      expect(wrapper.find('.doc-converter-btn').exists()).toBe(true);
    });
  });
  
  // Initialization tests
  describe('Initialization', () => {
    it('calls initialize method on mount', () => {
      const documentConverterMock = useDocumentConverter();
      const initializeSpy = vi.spyOn(documentConverterMock, 'initialize');
      
      const wrapper = createWrapper();
      
      expect(initializeSpy).toHaveBeenCalled();
    });
  });
  
  // Functionality tests
  describe('Functionality', () => {
    it('starts conversion when file is uploaded', async () => {
      const wrapper = createWrapper();
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Get the reference to mocked methods
      const documentConverterMock = useDocumentConverter();
      const uploadDocumentSpy = vi.spyOn(documentConverterMock, 'uploadDocument');
      const convertDocumentSpy = vi.spyOn(documentConverterMock, 'convertDocument');
      
      // Trigger file upload
      await wrapper.vm.startConversion(file);
      
      expect(uploadDocumentSpy).toHaveBeenCalledWith(file);
      expect(convertDocumentSpy).toHaveBeenCalledWith('doc2', expect.any(Function));
    });
    
    it('handles conversion cancellation', async () => {
      const wrapper = createWrapper();
      
      // Set active conversion
      await wrapper.setData({ 
        activeConversion: 'doc1',
        isConverting: true
      });
      
      // Get reference to cancellation method
      const documentConverterMock = useDocumentConverter();
      const cancelConversionSpy = vi.spyOn(documentConverterMock, 'cancelConversion');
      
      // Mock dialog confirmation
      const dialogMock = useGlobalDialog();
      vi.spyOn(dialogMock, 'confirm').mockResolvedValue(true);
      
      // Trigger cancellation
      await wrapper.vm.handleCancelConversion();
      
      // Verify cancellation was called
      expect(cancelConversionSpy).toHaveBeenCalledWith('doc1');
      
      // Verify state was reset
      expect(wrapper.vm.activeConversion).toBeNull();
      expect(wrapper.vm.conversionProgress).toBe(0);
    });
    
    it('does not cancel if user declines confirmation', async () => {
      const wrapper = createWrapper();
      
      // Set active conversion
      await wrapper.setData({ 
        activeConversion: 'doc1',
        isConverting: true
      });
      
      // Get reference to cancellation method
      const documentConverterMock = useDocumentConverter();
      const cancelConversionSpy = vi.spyOn(documentConverterMock, 'cancelConversion');
      
      // Mock dialog to return false (user declined)
      const dialogMock = useGlobalDialog();
      vi.spyOn(dialogMock, 'confirm').mockResolvedValue(false);
      
      // Trigger cancellation
      await wrapper.vm.handleCancelConversion();
      
      // Verify cancellation was not called
      expect(cancelConversionSpy).not.toHaveBeenCalled();
      
      // Verify state was not reset
      expect(wrapper.vm.activeConversion).toBe('doc1');
    });
    
    it('handles document viewing', async () => {
      const wrapper = createWrapper();
      
      // Mock documents state
      await wrapper.setData({
        documents: [
          {
            id: 'doc1',
            originalName: 'Document 1.pdf',
            originalFormat: 'pdf',
            status: 'success',
            convertedAt: new Date('2023-01-01T10:00:00Z')
          }
        ]
      });
      
      // Get reference to selection method
      const documentConverterMock = useDocumentConverter();
      const selectDocumentSpy = vi.spyOn(documentConverterMock, 'selectDocument');
      
      // Trigger document viewing
      await wrapper.vm.viewDocument('doc1');
      
      // Verify selection was called
      expect(selectDocumentSpy).toHaveBeenCalledWith('doc1');
      
      // Verify result is set
      expect(wrapper.vm.conversionResult).toBeTruthy();
      expect(wrapper.vm.conversionResult.id).toBe('doc1');
    });
    
    it('handles document deletion with confirmation', async () => {
      const wrapper = createWrapper();
      
      // Get reference to deletion method
      const documentConverterMock = useDocumentConverter();
      const deleteDocumentSpy = vi.spyOn(documentConverterMock, 'deleteDocument');
      
      // Mock dialog confirmation
      const dialogMock = useGlobalDialog();
      vi.spyOn(dialogMock, 'confirm').mockResolvedValue(true);
      
      // Trigger deletion
      await wrapper.vm.promptDeleteDocument('doc1');
      
      // Verify deletion was called
      expect(deleteDocumentSpy).toHaveBeenCalledWith('doc1');
    });
    
    it('does not delete if user declines confirmation', async () => {
      const wrapper = createWrapper();
      
      // Get reference to deletion method
      const documentConverterMock = useDocumentConverter();
      const deleteDocumentSpy = vi.spyOn(documentConverterMock, 'deleteDocument');
      
      // Mock dialog to return false (user declined)
      const dialogMock = useGlobalDialog();
      vi.spyOn(dialogMock, 'confirm').mockResolvedValue(false);
      
      // Trigger deletion
      await wrapper.vm.promptDeleteDocument('doc1');
      
      // Verify deletion was not called
      expect(deleteDocumentSpy).not.toHaveBeenCalled();
    });
    
    it('clears conversion result and selection', async () => {
      const wrapper = createWrapper();
      
      // Set a conversion result
      await wrapper.setData({ 
        conversionResult: {
          id: 'doc1',
          originalName: 'test.pdf',
          originalFormat: 'pdf',
          status: 'success'
        }
      });
      
      // Get reference to clear selection method
      const documentConverterMock = useDocumentConverter();
      const clearSelectionSpy = vi.spyOn(documentConverterMock, 'clearSelection');
      
      // Trigger clear result
      await wrapper.find('.doc-converter-btn').trigger('click');
      
      // Verify result is cleared
      expect(wrapper.vm.conversionResult).toBeNull();
      expect(clearSelectionSpy).toHaveBeenCalled();
    });
  });
  
  // Error handling tests
  describe('Error handling', () => {
    it('handles conversion errors gracefully', async () => {
      const wrapper = createWrapper();
      
      // Mock the document converter methods to throw an error
      const documentConverterMock = useDocumentConverter();
      vi.spyOn(documentConverterMock, 'uploadDocument').mockRejectedValue(new Error('Upload failed'));
      
      // Mock the dialog error method
      const dialogMock = useGlobalDialog();
      const errorDialogSpy = vi.spyOn(dialogMock, 'error');
      
      // Create a test file
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Try to start conversion (should fail)
      await wrapper.vm.startConversion(file);
      
      // Verify error dialog was shown
      expect(errorDialogSpy).toHaveBeenCalled();
      expect(errorDialogSpy.mock.calls[0][0].message).toBe('Upload failed');
    });
    
    it('enables fallback when specific errors occur', async () => {
      const wrapper = createWrapper();
      
      // Mock the document converter methods to throw a server error
      const documentConverterMock = useDocumentConverter();
      vi.spyOn(documentConverterMock, 'uploadDocument')
        .mockRejectedValue(new Error('SERVER_UNREACHABLE: Cannot connect to server'));
      
      // Create a test file
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Try to start conversion (should fail with server error)
      await wrapper.vm.startConversion(file);
      
      // Verify fallback is enabled
      expect(wrapper.vm.useFallback).toBe(true);
    });
  });
  
  // Cleanup tests
  describe('Cleanup', () => {
    it('cancels active conversion on unmount', async () => {
      const wrapper = createWrapper();
      
      // Set active conversion
      await wrapper.setData({ 
        activeConversion: 'doc1',
        isConverting: true 
      });
      
      // Get reference to cancellation method
      const documentConverterMock = useDocumentConverter();
      const cancelConversionSpy = vi.spyOn(documentConverterMock, 'cancelConversion');
      
      // Trigger unmount
      wrapper.unmount();
      
      // Verify cancellation was called
      expect(cancelConversionSpy).toHaveBeenCalledWith('doc1');
    });
  });
  
  // Edge cases
  describe('Edge cases', () => {
    it('handles missing document gracefully when viewing', async () => {
      const wrapper = createWrapper();
      
      // Set empty documents array
      await wrapper.setData({ documents: [] });
      
      // Attempt to view non-existent document
      await wrapper.vm.viewDocument('nonexistent');
      
      // Should not set conversion result for non-existent document
      expect(wrapper.vm.conversionResult).toBeNull();
    });
    
    it('handles download for special characters in document name', () => {
      // This is a test to verify the download URL handling
      const wrapper = createWrapper();
      
      // Mock window.location
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' } as any;
      
      // Mock import.meta.env
      vi.stubGlobal('import.meta', { env: { VITE_API_URL: 'https://api.example.com' } });
      
      // Trigger document download with special characters
      wrapper.vm.downloadDocument('doc-with-special-chars!@#');
      
      // Verify correct URL was constructed
      expect(window.location.href).toBe('https://api.example.com/api/documents/doc-with-special-chars!@#/download');
      
      // Restore original location
      window.location = originalLocation;
    });
  });
});