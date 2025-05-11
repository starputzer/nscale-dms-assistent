<template>
  <!-- Standard-Bestätigungsdialog für info/warning/error/success/confirm Typen -->
  <ConfirmDialog
    v-if="dialog.dialogType !== 'input'"
    v-model:isVisible="dialog.isVisible"
    :title="dialog.dialogTitle"
    :message="dialog.dialogMessage"
    :confirmButtonText="dialog.confirmButtonText"
    :cancelButtonText="dialog.cancelButtonText"
    :showCancelButton="dialog.showCancelButton"
    :type="dialog.dialogType"
    @confirm="dialog.handleConfirm"
    @cancel="dialog.handleCancel"
  />

  <!-- Input-Dialog für Benutzereingaben -->
  <InputDialog
    v-else
    v-model:isVisible="dialog.isVisible"
    :title="dialog.dialogTitle"
    :message="dialog.dialogMessage"
    :confirmButtonText="dialog.confirmButtonText"
    :cancelButtonText="dialog.cancelButtonText"
    :showCancelButton="dialog.showCancelButton"
    :inputLabel="dialog.inputLabel"
    :inputType="dialog.inputType"
    :placeholder="dialog.placeholder"
    :defaultValue="dialog.defaultValue"
    :minLength="dialog.minLength"
    :maxLength="dialog.maxLength"
    :required="dialog.required"
    :validationMessage="dialog.validationMessage"
    :validator="dialog.validator"
    @confirm="dialog.handleInputConfirm"
    @cancel="dialog.handleCancel"
  />
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import InputDialog from "./InputDialog.vue";
import { useGlobalDialog } from "@/composables/useDialog";

// Globalen Dialog-Service verwenden
const dialog = useGlobalDialog();

// Überschreiben der globalen window.confirm-Funktion
onMounted(() => {
  if (typeof window !== "undefined") {
    const originalConfirm = window.confirm;

    // window.confirm überschreiben
    window.confirm = (message: string) => {
      // Neues Promise erstellen
      return new Promise<boolean>((resolve) => {
        // Dialog anzeigen
        dialog.confirm({
          message,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }).then((result) => {
        // Kompatibilität mit dem ursprünglichen window.confirm
        return result;
      });
    };

    // Für Debugging-Zwecke
    (window as any).__originalConfirm = originalConfirm;
  }
});
</script>

<style scoped>
/* Keine zusätzlichen Stile erforderlich */
</style>
