import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FileUpload from '@/components/admin/document-converter/FileUpload.vue';

// Mock the composables
vi.mock('@/composables/useDialog', () => ({
  useGlobalDialog: () => ({
    error: vi.fn()
  })
}));

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => fallback || key
  })
}));

// Helper to create a test file
const createTestFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  return new File(['test content'], name, { type });
};

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(FileUpload, {
    props: {
      isUploading: false,
      uploadProgress: 0,
      maxFileSize: 50 * 1024 * 1024, // 50 MB
      allowedExtensions: ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt'],
      ...props
    },
    global: {
      mocks: {
        $t: (key: string, fallback: string) => fallback || key
      }
    }
  });
};

describe('FileUpload.vue', () => {
  // Rendering tests
  describe('Rendering', () => {
    it('renders the upload area correctly', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.file-upload').exists()).toBe(true);
      expect(wrapper.find('.file-upload__icon').exists()).toBe(true);
      expect(wrapper.find('.file-upload__text').exists()).toBe(true);
      expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    });
    
    it('shows supported formats in the hint text', () => {
      const allowedExtensions = ['pdf', 'docx'];
      const wrapper = createWrapper({ allowedExtensions });
      
      const hintText = wrapper.find('.file-upload__hint').text();
      expect(hintText).toContain('PDF, DOCX');
    });
    
    it('applies the dragging class when isDragging is true', async () => {
      const wrapper = createWrapper();
      
      // Simulate dragover event
      await wrapper.find('.file-upload').trigger('dragover');
      
      expect(wrapper.find('.file-upload').classes()).toContain('file-upload--dragging');
    });
    
    it('removes the dragging class on dragleave', async () => {
      const wrapper = createWrapper();
      
      // Set up dragging state
      await wrapper.find('.file-upload').trigger('dragover');
      expect(wrapper.find('.file-upload').classes()).toContain('file-upload--dragging');
      
      // Simulate dragleave event
      await wrapper.find('.file-upload').trigger('dragleave');
      
      expect(wrapper.find('.file-upload').classes()).not.toContain('file-upload--dragging');
    });
    
    it('displays different text when uploading', () => {
      const wrapper = createWrapper({ isUploading: true });
      
      const uploadingText = wrapper.find('.file-upload__text p').text();
      expect(uploadingText).toBe('Datei wird hochgeladen...');
    });
    
    it('displays progress bar when uploading', () => {
      const wrapper = createWrapper({ 
        isUploading: true,
        uploadProgress: 42
      });
      
      expect(wrapper.find('.file-upload__progress').exists()).toBe(true);
      expect(wrapper.find('.file-upload__progress-bar').attributes('style')).toContain('width: 42%');
      expect(wrapper.find('.file-upload__progress-text').text()).toBe('42%');
    });
    
    it('disables the file input when uploading', () => {
      const wrapper = createWrapper({ isUploading: true });
      
      expect(wrapper.find('input[type="file"]').attributes('disabled')).toBeDefined();
      expect(wrapper.find('.file-upload').classes()).toContain('file-upload--disabled');
    });
    
    it('shows selected file info when a file is selected', async () => {
      const wrapper = createWrapper();
      const file = createTestFile('document.pdf', 'application/pdf', 1024 * 1024); // 1MB
      
      // Set selected file via component's internal state
      await wrapper.setData({ selectedFile: file });
      
      expect(wrapper.find('.file-upload__selected').exists()).toBe(true);
      expect(wrapper.find('.file-upload__selected-name').text()).toBe('document.pdf');
      expect(wrapper.find('.file-upload__selected-size').text()).toContain('MB');
    });
  });
  
  // Interaction tests
  describe('Interactions', () => {
    it('opens file dialog when browse button is clicked', async () => {
      const wrapper = createWrapper();
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
      
      await wrapper.find('.file-upload__browse').trigger('click');
      
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
    
    it('doesn\'t open file dialog when browse is clicked during upload', async () => {
      const wrapper = createWrapper({ isUploading: true });
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
      
      await wrapper.find('.file-upload__browse').trigger('click');
      
      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });
    
    it('emits upload event with file when upload button is clicked', async () => {
      const wrapper = createWrapper();
      const file = createTestFile();
      
      // Set selected file
      await wrapper.setData({ selectedFile: file });
      
      // Click upload button
      await wrapper.find('.file-upload__upload-btn').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('upload');
      expect(wrapper.emitted('upload')?.[0][0]).toBe(file);
    });
    
    it('emits cancel event when clear button is clicked', async () => {
      const wrapper = createWrapper();
      
      // Set selected file
      await wrapper.setData({ selectedFile: createTestFile() });
      
      // Click clear button
      await wrapper.find('.file-upload__clear-btn').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('cancel');
      expect(wrapper.emitted('cancel')).toHaveLength(1);
    });
    
    it('clears the selected file when clear button is clicked', async () => {
      const wrapper = createWrapper();
      
      // Set selected file
      await wrapper.setData({ selectedFile: createTestFile() });
      
      // Click clear button
      await wrapper.find('.file-upload__clear-btn').trigger('click');
      
      // Check that selected file is cleared in the component's data
      expect(wrapper.vm.selectedFile).toBeNull();
    });
  });
  
  // File handling tests
  describe('File handling', () => {
    it('selects a valid file when file input changes', async () => {
      const wrapper = createWrapper();
      const file = createTestFile();
      
      // Simulate file selection
      const input = wrapper.find('input[type="file"]');
      
      // Need to mock the file input change event
      Object.defineProperty(input.element, 'files', {
        value: [file],
        writable: true
      });
      
      await input.trigger('change');
      
      // Verify the file was selected
      expect(wrapper.vm.selectedFile).toEqual(file);
    });
    
    it('validates file type against allowed extensions', async () => {
      const wrapper = createWrapper({
        allowedExtensions: ['pdf', 'docx']
      });
      
      const validFile = createTestFile('document.pdf', 'application/pdf');
      const invalidFile = createTestFile('document.txt', 'text/plain');
      
      // Simulate valid file selection
      await wrapper.vm.validateAndSelectFile(validFile);
      expect(wrapper.vm.selectedFile).toEqual(validFile);
      
      // Simulate invalid file selection
      const useGlobalDialog = await import('@/composables/useDialog');
      const errorMock = vi.fn();
      vi.mocked(useGlobalDialog.useGlobalDialog).mockReturnValue({
        error: errorMock
      });
      
      await wrapper.vm.validateAndSelectFile(invalidFile);
      
      // Should show error dialog for invalid file
      expect(errorMock).toHaveBeenCalled();
      expect(wrapper.vm.selectedFile).not.toEqual(invalidFile);
    });
    
    it('validates file size against maxFileSize', async () => {
      const maxFileSize = 1024 * 10; // 10KB
      const wrapper = createWrapper({ maxFileSize });
      
      const smallFile = createTestFile('small.pdf', 'application/pdf', 1024); // 1KB
      const largeFile = createTestFile('large.pdf', 'application/pdf', 1024 * 100); // 100KB
      
      // Simulate valid file size selection
      await wrapper.vm.validateAndSelectFile(smallFile);
      expect(wrapper.vm.selectedFile).toEqual(smallFile);
      
      // Simulate invalid file size selection
      const useGlobalDialog = await import('@/composables/useDialog');
      const errorMock = vi.fn();
      vi.mocked(useGlobalDialog.useGlobalDialog).mockReturnValue({
        error: errorMock
      });
      
      await wrapper.vm.validateAndSelectFile(largeFile);
      
      // Should show error dialog for file size
      expect(errorMock).toHaveBeenCalled();
      expect(wrapper.vm.selectedFile).not.toEqual(largeFile);
    });
    
    it('accepts files via drag and drop', async () => {
      const wrapper = createWrapper();
      const file = createTestFile();
      
      // Simulate drop event
      const dropEvent = {
        dataTransfer: {
          files: [file]
        },
        preventDefault: vi.fn()
      };
      
      await wrapper.find('.file-upload').trigger('drop', dropEvent);
      
      // Check that file was validated and selected
      expect(wrapper.vm.selectedFile).toBeTruthy();
      expect(wrapper.vm.isDragging).toBe(false);
    });
  });
  
  // Props tests
  describe('Props', () => {
    it('applies default props when not provided', () => {
      const wrapper = mount(FileUpload);
      
      expect(wrapper.props().isUploading).toBe(false);
      expect(wrapper.props().uploadProgress).toBe(0);
      expect(wrapper.props().maxFileSize).toBe(50 * 1024 * 1024);
      expect(wrapper.props().allowedExtensions).toContain('pdf');
    });
    
    it('updates UI when props change', async () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.file-upload--disabled').exists()).toBe(false);
      
      // Update the isUploading prop
      await wrapper.setProps({ isUploading: true, uploadProgress: 50 });
      
      expect(wrapper.find('.file-upload').classes()).toContain('file-upload--disabled');
      expect(wrapper.find('.file-upload__progress').exists()).toBe(true);
      expect(wrapper.find('.file-upload__progress-bar').attributes('style')).toContain('width: 50%');
    });
  });
  
  // Utility function tests
  describe('Utility functions', () => {
    it('formats file size correctly', () => {
      const wrapper = createWrapper();
      
      // Access the formatFileSize method
      const formatFileSize = wrapper.vm.formatFileSize;
      
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
  
  // Edge cases tests
  describe('Edge cases', () => {
    it('handles drop events with no files', async () => {
      const wrapper = createWrapper();
      
      // Simulate drop event with no files
      const dropEvent = {
        dataTransfer: {
          files: []
        },
        preventDefault: vi.fn()
      };
      
      await wrapper.find('.file-upload').trigger('drop', dropEvent);
      
      // Nothing should happen, no errors
      expect(wrapper.vm.selectedFile).toBeNull();
    });
    
    it('handles files with no extension', async () => {
      const wrapper = createWrapper();
      
      // Create a file with no extension
      const fileWithoutExtension = createTestFile('document', 'application/pdf');
      
      // Simulate file validation
      await wrapper.vm.validateAndSelectFile(fileWithoutExtension);
      
      // Should still be accepted based on MIME type
      expect(wrapper.vm.selectedFile).toEqual(fileWithoutExtension);
    });
  });
});