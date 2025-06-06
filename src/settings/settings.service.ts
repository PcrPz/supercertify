import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(Setting.name) private settingModel: Model<SettingDocument>
  ) {
    this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings() {
    try {
      const paymentSettings = await this.findByKey('payment_methods');
      
      if (!paymentSettings) {
        this.logger.log('Creating default payment methods settings...');
        
        const defaultPaymentMethods = {
          qr_payment: {
            enabled: true,
            account_name: 'บริษัท SuperCertify จำกัด',
            account_number: '0-9999-99999-99-9',
            qr_image: null,
            description: 'ชำระเงินผ่าน QR Code พร้อมเพย์'
          },
          bank_transfer: {
            enabled: true,
            bank_name: 'ธนาคารกสิกรไทย',
            account_name: 'บริษัท SuperCertify จำกัด',
            account_number: 'XXX-X-XXXXX-X',
            description: 'โอนเงินผ่านธนาคาร'
          }
        };
        
        await this.settingModel.updateOne(
          { key: 'payment_methods' },
          {
            $set: {
              key: 'payment_methods',
              value: defaultPaymentMethods,
              description: 'การตั้งค่าวิธีการชำระเงิน',
              group: 'payment'
            }
          },
          { upsert: true }
        );
        
        this.logger.log('✅ Default payment settings created');
      }
    } catch (error) {
      this.logger.error('❌ Error initializing default settings:', error);
    }
  }

  async findAll(): Promise<Setting[]> {
    return this.settingModel.find().exec();
  }

  async findByGroup(group: string): Promise<Setting[]> {
    return this.settingModel.find({ group }).exec();
  }

  async findByKey(key: string): Promise<SettingDocument | null> {
    return this.settingModel.findOne({ key }).exec();
  }

  async create(data: any, userId?: string): Promise<any> {
    const existingSetting = await this.findByKey(data.key);
    
    if (existingSetting) {
      throw new BadRequestException(`Setting with key '${data.key}' already exists`);
    }

    // Validate payment methods
    if (data.key === 'payment_methods') {
      const validation = this.validatePaymentMethods(data.value);
      if (!validation.valid) {
        throw new BadRequestException(`Validation failed: ${validation.errors?.join(', ')}`);
      }
    }
    
    const newSetting = new this.settingModel(data);
    const saved = await newSetting.save();
    
    return {
      success: true,
      data: saved,
      message: 'Setting created successfully'
    };
  }

  async update(key: string, value: any, userId?: string): Promise<any> {
    // Validate payment methods
    if (key === 'payment_methods') {
      const validation = this.validatePaymentMethods(value);
      if (!validation.valid) {
        throw new BadRequestException(`Validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    const setting = await this.settingModel.findOne({ key }).exec();
    
    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }
    
    setting.value = value;
    const saved = await setting.save();
    
    return {
      success: true,
      data: saved,
      message: 'Setting updated successfully'
    };
  }

  async delete(key: string, userId?: string): Promise<any> {
    const result = await this.settingModel.deleteOne({ key }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }
    
    return {
      success: true,
      message: 'Setting deleted successfully'
    };
  }

  async createOrUpdate(key: string, data: any, userId?: string): Promise<any> {
    const existingSetting = await this.findByKey(key);
    
    if (existingSetting) {
      return this.update(key, data.value || data, userId);
    } else {
      const createData = {
        key,
        value: data.value || data,
        description: data.description || '',
        group: data.group || 'general'
      };
      return this.create(createData, userId);
    }
  }

  // Simple validation for payment methods
  validatePaymentMethods(data: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Payment methods data must be an object');
      return { valid: false, errors };
    }

    // Check QR Payment
    if (data.qr_payment) {
      if (data.qr_payment.enabled && !data.qr_payment.account_name?.trim()) {
        errors.push('QR Payment account name is required when enabled');
      }
      if (data.qr_payment.enabled && !data.qr_payment.account_number?.trim()) {
        errors.push('QR Payment account number is required when enabled');
      }
    }

    // Check Bank Transfer
    if (data.bank_transfer) {
      if (data.bank_transfer.enabled && !data.bank_transfer.bank_name?.trim()) {
        errors.push('Bank name is required when bank transfer is enabled');
      }
      if (data.bank_transfer.enabled && !data.bank_transfer.account_name?.trim()) {
        errors.push('Bank account name is required when bank transfer is enabled');
      }
      if (data.bank_transfer.enabled && !data.bank_transfer.account_number?.trim()) {
        errors.push('Bank account number is required when bank transfer is enabled');
      }
    }

    // At least one method must be enabled
    const hasEnabledMethod = (data.qr_payment?.enabled) || (data.bank_transfer?.enabled);
    if (!hasEnabledMethod) {
      errors.push('At least one payment method must be enabled');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Get payment methods for public use
  async getFormattedPaymentMethods(): Promise<any> {
    try {
      const setting = await this.findByKey('payment_methods');
      return setting ? setting.value : this.getDefaultPaymentMethods();
    } catch (error) {
      this.logger.error('Error getting payment methods:', error);
      return this.getDefaultPaymentMethods();
    }
  }

  private getDefaultPaymentMethods() {
    return {
      qr_payment: {
        enabled: true,
        account_name: 'บริษัท SuperCertify จำกัด',
        account_number: '0-9999-99999-99-9',
        qr_image: null,
        description: 'ชำระเงินผ่าน QR Code พร้อมเพย์'
      },
      bank_transfer: {
        enabled: true,
        bank_name: 'ธนาคารกสิกรไทย',
        account_name: 'บริษัท SuperCertify จำกัด',
        account_number: 'XXX-X-XXXXX-X',
        description: 'โอนเงินผ่านธนาคาร'
      }
    };
  }
}