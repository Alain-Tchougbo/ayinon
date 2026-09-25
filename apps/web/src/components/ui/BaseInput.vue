<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    maxlength?: number;
    aide?: string;
  }>(),
  { type: "text", placeholder: "", required: false, maxlength: undefined, aide: "" },
);

defineEmits<{ "update:modelValue": [string] }>();
</script>

<template>
  <div>
    <label :for="id" class="mb-1 block text-sm font-medium text-texte">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :maxlength="maxlength"
      :aria-describedby="aide ? `${id}-aide` : undefined"
      class="w-full rounded-carte border border-bordure bg-surface px-3.5 py-2.5 text-sm text-texte placeholder:text-texte-attenue transition-colors focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/15"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="aide" :id="`${id}-aide`" class="mt-1 text-xs text-texte-attenue">{{ aide }}</p>
  </div>
</template>
