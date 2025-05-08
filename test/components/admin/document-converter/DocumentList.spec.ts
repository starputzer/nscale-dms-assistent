import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DocumentList from '@/components/admin/document-converter/DocumentList.vue';

// Mock the dialog composable
vi.mock('@/composables/useDialog', () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true)
  })
}));

// Mock document data
const mockDocuments = [
  {
    id: 'doc1',
    originalName: 'Document 1.pdf',
    originalFormat: 'pdf',
    size: 1024 * 1024, // 1MB
    status: 'success',
    convertedAt: new Date('2023-01-01T10:00:00Z')
  },
  {
    id: 'doc2',
    originalName: 'Document 2.docx',
    originalFormat: 'docx',
    size: 2 * 1024 * 1024, // 2MB
    status: 'error',
    error: 'Failed to convert document',
    uploadedAt: new Date('2023-01-02T10:00:00Z')
  },
  {
    id: 'doc3',
    originalName: 'Document 3.xlsx',
    originalFormat: 'xlsx',
    size: 512 * 1024, // 512KB
    status: 'pending',
    uploadedAt: new Date('2023-01-03T10:00:00Z')
  },
  {
    id: 'doc4',
    originalName: 'Document 4.pptx',
    originalFormat: 'pptx',
    size: 3 * 1024 * 1024, // 3MB
    status: 'processing',
    uploadedAt: new Date('2023-01-04T10:00:00Z')
  }
];

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(DocumentList, {
    props: {
      documents: [...mockDocuments],
      selectedDocument: null,
      loading: false,
      supportedFormats: ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'],
      ...props
    },
    global: {
      mocks: {
        $t: (key: string, params = {}) => {
          // Replace parameters in the key
          let result = key;
          Object.entries(params).forEach(([param, value]) => {
            result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
          });
          return result;
        }
      },
      stubs: {
        // We might need to stub components if they cause issues
      }
    }
  });
};

describe('DocumentList.vue', () => {
  // Rendering tests
  describe('Rendering', () => {
    it('renders the document list with correct number of items', () => {
      const wrapper = createWrapper();
      const items = wrapper.findAll('.document-item');
      
      expect(items.length).toBe(4); // 4 mock documents
    });
    
    it('displays loading indicator when loading prop is true', () => {
      const wrapper = createWrapper({ loading: true });
      
      expect(wrapper.find('.loading-indicator').exists()).toBe(true);
      expect(wrapper.find('.document-items').exists()).toBe(false);
    });
    
    it('displays empty state when no documents are available', () => {
      const wrapper = createWrapper({ documents: [] });
      
      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.document-items').exists()).toBe(false);
    });
    
    it('displays empty state with different message when filters return no results', async () => {
      const wrapper = createWrapper();
      
      // Set a search query that won't match any documents
      await wrapper.setData({ searchQuery: 'nonexistent document' });
      
      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-state p').text()).toContain('noMatchingDocuments');
    });
    
    it('displays document details correctly', () => {
      const wrapper = createWrapper();
      const firstDocument = wrapper.find('.document-item');
      
      expect(firstDocument.find('.document-name').text()).toBe('Document 1.pdf');
      expect(firstDocument.find('.document-format').text()).toContain('PDF');
      expect(firstDocument.find('.document-size').text()).toContain('MB');
      expect(firstDocument.find('.document-date').exists()).toBe(true);
    });
    
    it('shows different icon for each document type', () => {
      const wrapper = createWrapper();
      const items = wrapper.findAll('.document-item');
      
      expect(items[0].find('.document-icon').classes()).toContain('document-icon--pdf');
      expect(items[1].find('.document-icon').classes()).toContain('document-icon--docx');
      expect(items[2].find('.document-icon').classes()).toContain('document-icon--xlsx');
      expect(items[3].find('.document-icon').classes()).toContain('document-icon--pptx');
    });
    
    it('disables action buttons based on document status', () => {
      const wrapper = createWrapper();
      const items = wrapper.findAll('.document-item');
      
      // Success status should have enabled buttons
      expect(items[0].find('.action-btn[disabled]').exists()).toBe(false);
      
      // Error status should have disabled buttons
      const errorDocBtns = items[1].findAll('.action-btn');
      expect(errorDocBtns[0].attributes('disabled')).toBeDefined();
      expect(errorDocBtns[1].attributes('disabled')).toBeDefined();
    });
    
    it('displays appropriate status indicators', () => {
      const wrapper = createWrapper();
      const items = wrapper.findAll('.document-item');
      
      expect(items[0].find('.document-status').classes()).toContain('document-status--success');
      expect(items[1].find('.document-status').classes()).toContain('document-status--error');
      expect(items[2].find('.document-status').classes()).toContain('document-status--pending');
      expect(items[3].find('.document-status').classes()).toContain('document-status--processing');
    });
    
    it('highlights the selected document', () => {
      const wrapper = createWrapper({
        selectedDocument: mockDocuments[0]
      });
      
      const firstDocument = wrapper.find('.document-item');
      expect(firstDocument.classes()).toContain('document-item--selected');
    });
    
    it('displays pagination when there are many documents', async () => {
      // Create many documents to trigger pagination
      const manyDocs = Array.from({ length: 15 }, (_, i) => ({
        id: `doc${i + 1}`,
        originalName: `Document ${i + 1}.pdf`,
        originalFormat: 'pdf',
        size: 1024 * 1024,
        status: 'success',
        convertedAt: new Date()
      }));
      
      const wrapper = createWrapper({
        documents: manyDocs
      });
      
      // Set a smaller itemsPerPage value to ensure pagination
      await wrapper.setData({ itemsPerPage: 5 });
      
      expect(wrapper.find('.pagination').exists()).toBe(true);
      expect(wrapper.findAll('.document-item').length).toBe(5); // Only first page items
    });
  });
  
  // Interaction tests
  describe('Interactions', () => {
    it('emits select event when a document is clicked', async () => {
      const wrapper = createWrapper();
      
      await wrapper.find('.document-item').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('select');
      expect(wrapper.emitted('select')?.[0][0]).toBe('doc1');
    });
    
    it('emits view event when view button is clicked', async () => {
      const wrapper = createWrapper();
      
      // Click view button on first document (success status)
      await wrapper.findAll('.action-btn')[0].trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('view');
      expect(wrapper.emitted('view')?.[0][0]).toBe('doc1');
    });
    
    it('emits download event when download button is clicked', async () => {
      const wrapper = createWrapper();
      
      // Click download button on first document (success status)
      await wrapper.findAll('.action-btn')[1].trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('download');
      expect(wrapper.emitted('download')?.[0][0]).toBe('doc1');
    });
    
    it('shows confirmation dialog and emits delete event when delete button is clicked', async () => {
      const wrapper = createWrapper();
      
      // Click delete button on first document
      await wrapper.findAll('.action-btn')[2].trigger('click');
      
      // Since we mocked the confirm dialog to return true,
      // the delete event should be emitted
      expect(wrapper.emitted()).toHaveProperty('delete');
      expect(wrapper.emitted('delete')?.[0][0]).toBe('doc1');
    });
    
    it('filters documents when search query is entered', async () => {
      const wrapper = createWrapper();
      
      // Initially shows all documents
      expect(wrapper.findAll('.document-item').length).toBe(4);
      
      // Enter search query
      await wrapper.find('.search-input').setValue('Document 1');
      
      // Should only show matching documents
      expect(wrapper.findAll('.document-item').length).toBe(1);
      expect(wrapper.find('.document-name').text()).toBe('Document 1.pdf');
    });
    
    it('filters documents by status', async () => {
      const wrapper = createWrapper();
      
      // Select status filter
      await wrapper.find('.status-filter').setValue('error');
      
      // Should only show error documents
      expect(wrapper.findAll('.document-item').length).toBe(1);
      expect(wrapper.find('.document-status').classes()).toContain('document-status--error');
    });
    
    it('filters documents by format', async () => {
      const wrapper = createWrapper();
      
      // Select format filter
      await wrapper.find('.format-filter').setValue('pdf');
      
      // Should only show PDF documents
      expect(wrapper.findAll('.document-item').length).toBe(1);
      expect(wrapper.find('.document-format').text()).toContain('PDF');
    });
    
    it('sorts documents by name', async () => {
      const wrapper = createWrapper();
      
      // Sort by name in ascending order
      await wrapper.find('.sort-by').setValue('name');
      await wrapper.find('.sort-direction').trigger('click'); // Toggle to ascending
      
      const documentNames = wrapper.findAll('.document-name').map(el => el.text());
      expect(documentNames[0]).toBe('Document 1.pdf');
      expect(documentNames[1]).toBe('Document 2.docx');
      expect(documentNames[2]).toBe('Document 3.xlsx');
      expect(documentNames[3]).toBe('Document 4.pptx');
    });
    
    it('clears all filters when clear filters button is clicked', async () => {
      const wrapper = createWrapper();
      
      // Apply some filters
      await wrapper.setData({
        searchQuery: 'Document',
        statusFilter: 'success',
        formatFilter: 'pdf'
      });
      
      // Verify filters are applied
      expect(wrapper.findAll('.document-item').length).toBe(1);
      
      // Click clear filters button
      await wrapper.find('.clear-filters-btn').trigger('click');
      
      // Verify filters are cleared
      expect(wrapper.vm.searchQuery).toBe('');
      expect(wrapper.vm.statusFilter).toBe('');
      expect(wrapper.vm.formatFilter).toBe('');
      expect(wrapper.findAll('.document-item').length).toBe(4);
    });
    
    it('handles pagination navigation correctly', async () => {
      // Create many documents to trigger pagination
      const manyDocs = Array.from({ length: 15 }, (_, i) => ({
        id: `doc${i + 1}`,
        originalName: `Document ${i + 1}.pdf`,
        originalFormat: 'pdf',
        size: 1024 * 1024,
        status: 'success',
        convertedAt: new Date()
      }));
      
      const wrapper = createWrapper({
        documents: manyDocs
      });
      
      // Set a smaller itemsPerPage value to ensure pagination
      await wrapper.setData({ itemsPerPage: 5 });
      
      // Initial page is 1
      expect(wrapper.vm.currentPage).toBe(1);
      expect(wrapper.findAll('.document-item').length).toBe(5);
      
      // Navigate to next page
      await wrapper.find('.pagination-btn:last-child').trigger('click');
      
      expect(wrapper.vm.currentPage).toBe(2);
      expect(wrapper.findAll('.document-item').length).toBe(5);
      
      // Navigate to previous page
      await wrapper.find('.pagination-btn:first-child').trigger('click');
      
      expect(wrapper.vm.currentPage).toBe(1);
    });
  });
  
  // Props tests
  describe('Props', () => {
    it('uses default props when not provided', () => {
      const wrapper = mount(DocumentList);
      
      expect(wrapper.props().documents).toEqual([]);
      expect(wrapper.props().selectedDocument).toBeNull();
      expect(wrapper.props().loading).toBe(false);
      expect(wrapper.props().supportedFormats).toContain('pdf');
    });
    
    it('updates UI when props change', async () => {
      const wrapper = createWrapper();
      
      // Initially not loading
      expect(wrapper.find('.loading-indicator').exists()).toBe(false);
      
      // Update loading prop
      await wrapper.setProps({ loading: true });
      
      expect(wrapper.find('.loading-indicator').exists()).toBe(true);
    });
    
    it('updates document list when documents prop changes', async () => {
      const wrapper = createWrapper();
      
      // Initially has 4 items
      expect(wrapper.findAll('.document-item').length).toBe(4);
      
      // Update documents prop
      await wrapper.setProps({ 
        documents: mockDocuments.slice(0, 2) 
      });
      
      // Should now have 2 items
      expect(wrapper.findAll('.document-item').length).toBe(2);
    });
  });
  
  // Utility function tests
  describe('Utility functions', () => {
    it('formats file size correctly', () => {
      const wrapper = createWrapper();
      
      // Access the formatFileSize method
      const formatFileSize = wrapper.vm.formatFileSize;
      
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1023)).toBe('1 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
    
    it('formats date correctly', () => {
      const wrapper = createWrapper();
      
      // Access the formatDate method
      const formatDate = wrapper.vm.formatDate;
      
      const date = new Date('2023-01-01T10:00:00Z');
      expect(formatDate(date)).toMatch(/\d{2}\.\d{2}\.\d{4}/); // Should match DD.MM.YYYY format
      expect(formatDate(null)).toBe('');
      expect(formatDate('invalid date')).toBe('');
    });
    
    it('returns correct icon for each format', () => {
      const wrapper = createWrapper();
      
      // Access the getFormatIcon method
      const getFormatIcon = wrapper.vm.getFormatIcon;
      
      expect(getFormatIcon('pdf')).toBe('fa fa-file-pdf');
      expect(getFormatIcon('docx')).toBe('fa fa-file-word');
      expect(getFormatIcon('xlsx')).toBe('fa fa-file-excel');
      expect(getFormatIcon('pptx')).toBe('fa fa-file-powerpoint');
      expect(getFormatIcon('unknown')).toBe('fa fa-file'); // Fallback icon
    });
  });
  
  // Edge cases tests
  describe('Edge cases', () => {
    it('handles documents with missing properties gracefully', () => {
      const incompleteDocuments = [
        {
          id: 'doc1',
          originalName: 'Document with minimal properties.pdf',
          originalFormat: 'pdf',
        }
      ];
      
      const wrapper = createWrapper({ documents: incompleteDocuments });
      
      // Should still render without errors
      expect(wrapper.find('.document-item').exists()).toBe(true);
      expect(wrapper.find('.document-name').text()).toBe('Document with minimal properties.pdf');
    });
    
    it('handles invalid date values gracefully', () => {
      const docsWithInvalidDates = [
        {
          id: 'doc1',
          originalName: 'Document with invalid date.pdf',
          originalFormat: 'pdf',
          convertedAt: 'not a date'
        }
      ];
      
      const wrapper = createWrapper({ documents: docsWithInvalidDates });
      
      // Should still render without errors
      expect(wrapper.find('.document-date').text()).toContain('');
    });
    
    it('handles pagination edge cases correctly', async () => {
      const wrapper = createWrapper();
      
      // Set to last page
      await wrapper.setData({ 
        currentPage: 1,
        itemsPerPage: 2 // This will make 2 pages with 4 items
      });
      
      // Click next
      await wrapper.find('.pagination-btn:last-child').trigger('click');
      expect(wrapper.vm.currentPage).toBe(2);
      
      // Try to go beyond last page
      await wrapper.find('.pagination-btn:last-child').trigger('click');
      expect(wrapper.vm.currentPage).toBe(2); // Should stay on last page
      
      // Try to go below first page
      await wrapper.setData({ currentPage: 1 });
      await wrapper.find('.pagination-btn:first-child').trigger('click');
      expect(wrapper.vm.currentPage).toBe(1); // Should stay on first page
    });
  });
});