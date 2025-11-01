import fs from "fs/promises";
import path from "path";
import { logger } from "./logger";

export class FileSystemUtils {
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Diretório garantido: ${dirPath}`);
    } catch (error) {
      logger.error(`Erro ao criar diretório ${dirPath}`, error);
      throw error;
    }
  }

  static async writeJSON(filePath: string, data: any): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      logger.info(`Arquivo salvo: ${filePath}`);
    } catch (error) {
      logger.error(`Erro ao salvar arquivo ${filePath}`, error);
      throw error;
    }
  }

  static async readJSON<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`Erro ao ler arquivo ${filePath}`, error);
      throw error;
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      logger.error(`Erro ao ler arquivo ${filePath}`, error);
      throw error;
    }
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);
      await fs.writeFile(filePath, content, "utf-8");
      logger.debug(`Arquivo salvo: ${filePath}`);
    } catch (error) {
      logger.error(`Erro ao salvar arquivo ${filePath}`, error);
      throw error;
    }
  }

  static async removeDirectory(dirPath: string): Promise<void> {
    try {
      const exists = await this.fileExists(dirPath);
      if (exists) {
        await fs.rm(dirPath, { recursive: true, force: true });
        logger.debug(`Diretório removido: ${dirPath}`);
      }
    } catch (error) {
      logger.error(`Erro ao remover diretório ${dirPath}`, error);
      throw error;
    }
  }
}
