import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BatchUpload from '@/components/admin/document-converter/BatchUpload.vue';

// Mock composables and services
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => fallback || key
  })
}));

vi.mock('@/composables/useDialog', () => ({
  useGlobalDialog: () => ({
    confirm: vi.fn(({ onConfirm }) => onConfirm?.()),
    error: vi.fn()
  })
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}));

// Mock DocumentConverterStore
const mockStoreActions = {
  uploadDocument: vi.fn().mockImplementation(() => Promise.resolve('doc-123')),
  uploadProgress: 50
};

vi.mock('@/stores/documentConverter', () => ({
  useDocumentConverterStore: () => mockStoreActions
}));

// Helper to create a file
function createFile(name: string, size: number, type: string): File {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('BatchUpload.vue', () => {
  beforeEach(() => {
    // Reset mocks and setup Pinia
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('renders correctly with default props', () => {
    const wrapper = mount(BatchUpload);
    expect(wrapper.find('.batch-upload__title').exists()).toBe(true);
    expect(wrapper.find('.batch-upload__dropzone').exists()).toBe(true);
    expect(wrapper.find('.batch-upload__empty').exists()).toBe(true);
  });

  it('updates props correctly', () => {
    const wrapper = mount(BatchUpload, {
      props: {
        maxFiles: 10,
        maxFileSize: 25 * 1024 * 1024,
        allowedExtensions: ['pdf', 'docx']
      }
    });

    // Check that props are correctly applied
    const vm = wrapper.vm as any;
    expect(vm.maxFiles).toBe(10);
    expect(vm.maxFileSize).toBe(25 * 1024 * 1024);
    expect(vm.allowedExtensions).toEqual(['pdf', 'docx']);
  });

  it('validates file types correctly', async () => {
    const wrapper = mount(BatchUpload, {
      props: {
        allowedExtensions: ['pdf', 'docx']
      }
    });
    const vm = wrapper.vm as any;

    // Valid PDF file
    const pdfFile = createFile('document.pdf', 1024, 'application/pdf');
    expect(vm.isFileTypeSupported(pdfFile)).toBe(true);

    // Invalid file type
    const txtFile = createFile('document.txt', 1024, 'text/plain');
    expect(vm.isFileTypeSupported(txtFile)).toBe(false);
  });

  it('handles adding files to batch', async () => {
    const wrapper = mount(BatchUpload);
    const vm = wrapper.vm as any;

    // Mock file input event
    const mockFile = createFile('document.pdf', 1024, 'application/pdf');
    
    // Directly call addFileToBatch method 
    await vm.addFileToBatch(mockFile);
    
    // File should be added to the batch
    expect(vm.batchFiles.length).toBe(1);
    expect(vm.batchFiles[0].file).toBe(mockFile);
    expect(vm.batchFiles[0].validationStatus).toBe('valid'); // After validation
  });

  it('rejects files exceeding size limit', async () => {
    const wrapper = mount(BatchUpload, {
      props: {
        maxFileSize: 1000 // 1KB limit
      }
    });
    const vm = wrapper.vm as any;

    // Mock file that's too large
    const largeFile = createFile('large.pdf', 2000, 'application/pdf');
    
    // Add the file to the batch
    await vm.addFileToBatch(largeFile);
    
    // File should be added but marked as invalid
    expect(vm.batchFiles.length).toBe(1);
    expect(vm.batchFiles[0].validationStatus).toBe('invalid');
  });

  it('handles batch upload flow correctly', async () => {
    const wrapper = mount(BatchUpload);
    const vm = wrapper.vm as any;

    // Add valid files to the batch
    const file1 = createFile('doc1.pdf', 1024, 'application/pdf');
    const file2 = createFile('doc2.pdf', 1024, 'application/pdf');
    
    await vm.addFileToBatch(file1);
    await vm.addFileToBatch(file2);
    
    expect(vm.batchFiles.length).toBe(2);
    expect(vm.validFilesCount).toBe(2);

    // Setup emit spy
    const startBatchSpy = vi.spyOn(wrapper.vm, 'startBatchUpload');
    
    // Find and click start button
    await wrapper.find('.batch-upload__start-btn').trigger('click');
    
    // Should call startBatchUpload
    expect(startBatchSpy).toHaveBeenCalled();
  });

  it('emits correct events', async () => {
    const wrapper = mount(BatchUpload);
    const vm = wrapper.vm as any;
    
    // Add valid file
    const pdfFile = createFile('document.pdf', 1024, 'application/pdf');
    await vm.addFileToBatch(pdfFile);
    
    // Call uploadSingleFile directly to test event emission
    await vm.uploadSingleFile(0);
    
    // Check emitted events
    expect(wrapper.emitted('upload-single')).toBeTruthy();
    expect(wrapper.emitted('upload-single')![0][0]).toBe(pdfFile);
  });

  it('calculates total size correctly', async () => {
    const wrapper = mount(BatchUpload);
    const vm = wrapper.vm as any;
    
    // Add files with known sizes
    const file1 = createFile('doc1.pdf', 1024, 'application/pdf'); // 1KB
    const file2 = createFile('doc2.pdf', 2048, 'application/pdf'); // 2KB
    
    await vm.addFileToBatch(file1);
    await vm.addFileToBatch(file2);
    
    // Total size should be 3KB (3072 bytes)
    expect(vm.totalFilesSize).toBe(3072);
    expect(vm.totalSizeFormatted).toBe('3 KB');
  });

  it('detects total size exceeded', async () => {
    const wrapper = mount(BatchUpload, {
      props: {
        maxTotalSize: 2000 // 2KB total limit
      }
    });
    const vm = wrapper.vm as any;
    
    // Add files exceeding total size
    const file1 = createFile('doc1.pdf', 1024, 'application/pdf'); // 1KB
    const file2 = createFile('doc2.pdf', 2048, 'application/pdf'); // 2KB (total 3KB)
    
    await vm.addFileToBatch(file1);
    await vm.addFileToBatch(file2);
    
    // Total size exceeded flag should be true
    expect(vm.isTotalSizeExceeded).toBe(true);
    
    // Error message should be displayed
    await flushPromises();
    expect(wrapper.find('.batch-upload__error-message').exists()).toBe(true);
  });

  it('prioritizes files correctly', async () => {
    const wrapper = mount(BatchUpload);
    const vm = wrapper.vm as any;
    
    // Add valid files
    const file1 = createFile('doc1.pdf', 1024, 'application/pdf');
    const file2 = createFile('doc2.pdf', 1024, 'application/pdf');
    
    await vm.addFileToBatch(file1);
    await vm.addFileToBatch(file2);
    
    // Set priorities
    vm.batchFiles[0].priority = 'high';
    vm.batchFiles[1].priority = 'low';
    
    // Set all to normal
    await vm.setPriorityForAll('normal');
    
    // All should now be normal
    expect(vm.batchFiles[0].priority).toBe('normal');
    expect(vm.batchFiles[1].priority).toBe('normal');
  });
  
  it('calculates batch statistics correctly', async () => {
    const wrapper = mount(BatchUpload);
    const vm = wrapper.vm as any;
    
    // Add a mix of valid and invalid files
    const validFile = createFile('valid.pdf', 1024, 'application/pdf');
    const invalidFile = createFile('invalid.exe', 1024, 'application/octet-stream');
    
    await vm.addFileToBatch(validFile);
    await vm.addFileToBatch(invalidFile);
    
    // Check counts
    expect(vm.validFilesCount).toBe(1);
    expect(vm.invalidFilesCount).toBe(1);
    
    // Remove invalid files
    await vm.removeInvalidFiles();
    
    // Should only have valid files left
    expect(vm.batchFiles.length).toBe(1);
    expect(vm.batchFiles[0].file).toBe(validFile);
  });
});